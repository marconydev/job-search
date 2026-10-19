import { collectors } from "../collectors/index.js"

import { refreshExistingJobs } from "../repositories/job-repository.js"

import { registrarTelemetriaFonte } from "../repositories/funil-telemetria-repository.js"
import { ELEGIBILIDADE_VERSION } from "./elegibilidade-localizacao.js"
import { MATCHER_VERSION } from "../config/matcher.js"
import { createHash } from "node:crypto"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { analyzePendingJobs } from "./job-analysis.js"

import { coletarFontesAtsAprendidas } from "./fontes-ats.js"

import {
  diagnosticarFunilVagasComYield,
  filtrarVagasAderentesComYield,
  type DiagnosticoFunilVagas
} from "./filtragem-vagas.js"

import { importJobs, type JobImportResult } from "./job-import.js"

import { processarVagasWeb } from "./processamento-vagas-web.js"

type ResultadoFonte = JobImportResult & {
  matched: number

  error?: string
}

export type EtapaSincronizacao = "fontes_diretas" | "web" | "ats" | "analise"

type OpcoesSincronizacao = {
  usarBrave?: boolean

  limiteChamadasBrave?: number

  /**
   * Identificador da execucao em segundo plano.
   *
   * Quando presente, cada fonte registra contadores em funil_telemetria.
   * Quando ausente, a telemetria e pulada sem afetar o fluxo.
   */
  execucaoId?: string

  aoAtualizarEtapa?: (etapa: EtapaSincronizacao) => Promise<void> | void
}

/**
 * Rotação conservadora para o ambiente gratuito.
 */
const LIMITE_FONTES_ATS_POR_EXECUCAO = 8

const LIMITE_VAGAS_POR_FONTE_ATS = 150

function agoraMs() {
  return performance.now()
}

function formatarDuracao(inicio: number) {
  return ((performance.now() - inicio) / 1000).toFixed(2)
}

function cederEventLoop() {
  return new Promise<void>(resolve => {
    setImmediate(resolve)
  })
}

async function atualizarEtapa(opcoes: OpcoesSincronizacao, etapa: EtapaSincronizacao) {
  if (opcoes.aoAtualizarEtapa) {
    await opcoes.aoAtualizarEtapa(etapa)
  }

  await cederEventLoop()
}

function registrarDiagnosticoFonte(fonte: string, diagnostico: DiagnosticoFunilVagas) {
  console.log(
    [
      `Funil fonte: ${fonte}`,
      `recebidas=${diagnostico.recebidas}`,
      `fora_janela=${diagnostico.foraDaJanela}`,
      `localizacao=${diagnostico.localizacaoIncompativel}`,
      `titulo_fora_foco=${diagnostico.tituloForaFoco}`,
      `matcher=${diagnostico.matcherAbaixoDoMinimo}`,
      `score_0=${diagnostico.scoreZero}`,
      `score_1_39=${diagnostico.score1a39}`,
      `score_40_49=${diagnostico.score40a49}`,
      `score_50_59=${diagnostico.score50a59}`,
      `aderentes=${diagnostico.aderentes}`,
      `divergencias=${diagnostico.divergencias}`
    ].join(" | ")
  )

  for (const exemplo of diagnostico.exemplosQuaseAderentes) {
    console.log(
      `Quase aderente: ${fonte} | score=${exemplo.score} | ` +
        `${exemplo.title} | ${exemplo.company} | ${exemplo.reason}`
    )
  }
}

async function processarFonteDireta(
  coletor: any, // Collector
  perfil: PerfilProfissional,
  limite: number,
  execucaoId?: string,
  perfilHash?: string
): Promise<ResultadoFonte> {
  const inicioFonte = performance.now();

  try {
    const coleta = await coletor.collect(limite, perfil)
    const atualizacao = await refreshExistingJobs(coleta.jobs)

    if (atualizacao.updated > 0 || atualizacao.invalidated > 0) {
      console.log(`Fonte direta: ${coleta.source} - ${atualizacao.updated} atualizada(s), ${atualizacao.invalidated} reanalise.`)
    }

    const vagasAderentes = await filtrarVagasAderentesComYield(coleta.jobs, perfil)
    const importacao = await importJobs({ source: coleta.source, jobs: vagasAderentes })
    
    console.log(`Fonte direta: ${coleta.source} - ${coleta.jobs.length} encontradas, ${vagasAderentes.length} aderentes, ${importacao.inserted} novas. (${((performance.now() - inicioFonte)/1000).toFixed(2)}s)`)

    try {
      const diagnostico = await diagnosticarFunilVagasComYield(coleta.jobs, perfil, vagasAderentes)
      registrarDiagnosticoFonte(coleta.source, diagnostico)
      if (execucaoId) {
        await registrarTelemetriaFonte({
          execucaoId, fonte: coleta.source,
          coletadas: diagnostico.recebidas,
          aposJanela: diagnostico.recebidas - diagnostico.foraDaJanela,
          aposElegibilidade: diagnostico.recebidas - diagnostico.foraDaJanela - diagnostico.localizacaoIncompativel,
          aposMatcher: diagnostico.aderentes,
          importadas: importacao.inserted, duplicadas: importacao.duplicates,
          descartes: {
            foraDaJanela: diagnostico.foraDaJanela, localizacaoIncompativel: diagnostico.localizacaoIncompativel,
            tituloForaFoco: diagnostico.tituloForaFoco, matcherAbaixoDoMinimo: diagnostico.matcherAbaixoDoMinimo,
            scoreZero: diagnostico.scoreZero, score1a39: diagnostico.score1a39,
            score40a49: diagnostico.score40a49, score50a59: diagnostico.score50a59,
            localizacaoInferida: (diagnostico as any).localizacaoInferida || 0
          },
          duracaoMs: Math.round(performance.now() - inicioFonte),
          commitHash: process.env.RENDER_GIT_COMMIT || "local",
          matcherVersion: MATCHER_VERSION, elegibilidadeVersion: ELEGIBILIDADE_VERSION,
          perfilHash: perfilHash || "unknown",
          bootTimestamp: new Date().toISOString(), metricas: {}
        })
      }
    } catch (e) { console.warn(`Erro telemetria ${coleta.source}:`, e) }

    return { ...importacao, found: coleta.jobs.length, matched: vagasAderentes.length }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido"
    return { source: coletor.name, found: 0, matched: 0, inserted: 0, duplicates: 0, error: mensagem }
  }
}

async function coletarFontesDiretas(
  perfil: PerfilProfissional,
  limite: number,
  execucaoId?: string
): Promise<ResultadoFonte[]> {
  const resultados: ResultadoFonte[] = []
  const perfilHash = createHash("sha256").update(JSON.stringify(perfil)).digest("hex").slice(0, 16);

  const executarComPool = async (itens: any[], tamanho: number, fn: (item: any, indice: number) => Promise<void>) => {
    let proximo = 0;
    const executar = async () => {
      while (true) {
        const i = proximo++;
        if (i >= itens.length) return;
        await fn(itens[i], i);
      }
    };
    const workers = [];
    for (let w = 0; w < Math.min(tamanho, itens.length); w++) workers.push(executar());
    await Promise.all(workers);
  };

  const CONCORRENCIA_DIRETAS = 3;
  await executarComPool(collectors, CONCORRENCIA_DIRETAS, async (coletor, indice) => {
    resultados[indice] = await processarFonteDireta(coletor, perfil, limite, execucaoId, perfilHash);
  });

  return resultados
}

function normalizarLimiteBrave(valor: number | undefined) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return 30
  }

  return Math.max(0, Math.floor(valor))
}

export async function syncJobs(
  perfil: PerfilProfissional,
  limite = 100,
  opcoes: OpcoesSincronizacao = {}
) {
  const inicioTotal = agoraMs()

  const usarBrave = opcoes.usarBrave === true

  const limiteBrave = usarBrave ? normalizarLimiteBrave(opcoes.limiteChamadasBrave) : 0

  console.log("")

  console.log(
    usarBrave
      ? `Sincronização: Brave autorizada com limite de ${limiteBrave} chamada(s).`
      : "Sincronização: Brave desativada. Usando fontes diretas, ATS aprendidos e cache."
  )

  /**
   * ETAPA 1
   */
  await atualizarEtapa(opcoes, "fontes_diretas")

  const inicioFontes = agoraMs()

  const fontesDiretas = await coletarFontesDiretas(perfil, limite, opcoes.execucaoId)

  console.log(`Tempo fontes diretas: ${formatarDuracao(inicioFontes)}s`)

  await cederEventLoop()

  /**
   * ETAPA 2
   */
  await atualizarEtapa(opcoes, "web")

  const inicioWeb = agoraMs()

  const web = await processarVagasWeb(perfil, {
    salvarCompativeis: true,

    permitirBuscaLive: usarBrave,

    limiteChamadasBrave: limiteBrave,
    execucaoId: opcoes.execucaoId
  })

  if (opcoes.execucaoId) {
    try {
      await registrarTelemetriaFonte({
        execucaoId: opcoes.execucaoId,
        fonte: "web",
        coletadas: web.paginasDescobertas || 0,
        aposJanela: web.paginasDescobertas || 0,
        aposElegibilidade: web.compativeisBrasil || 0,
        aposMatcher: web.recomendacoesDescoberta?.length || 0,
        importadas: web.persistenciaDescoberta?.novas || 0,
        duplicadas: web.persistenciaDescoberta?.atualizadas || 0,
        descartes: {},
        duracaoMs: Math.round(agoraMs() - inicioWeb),
        commitHash: process.env.RENDER_GIT_COMMIT || "local",
        matcherVersion: MATCHER_VERSION,
        elegibilidadeVersion: ELEGIBILIDADE_VERSION,
        perfilHash: "web",
        bootTimestamp: new Date().toISOString(),
        metricas: {}
      })
    } catch (e) {
      console.warn("Erro ao registrar telemetria web:", e)
    }
  }

  console.log(`Tempo web/cache: ${formatarDuracao(inicioWeb)}s`)

  await cederEventLoop()

  /**
   * ETAPA 3
   */
  await atualizarEtapa(opcoes, "ats")

  const inicioAts = agoraMs()

  const fontesAts = await coletarFontesAtsAprendidas(
    perfil,
    LIMITE_FONTES_ATS_POR_EXECUCAO,
    LIMITE_VAGAS_POR_FONTE_ATS,
    opcoes.execucaoId
  )

  console.log(`Tempo ATS: ${formatarDuracao(inicioAts)}s`)

  const fontes: ResultadoFonte[] = [...fontesDiretas, ...fontesAts]

  await cederEventLoop()

  /**
   * ETAPA 4
   *
   * Analiso somente o que está pendente para a versão atual:
   *
   * - vagas novas;
   * - análises de versão antiga;
   * - vagas alteradas pela fonte.
   */
  await atualizarEtapa(opcoes, "analise")

  const inicioAnalise = agoraMs()

  const analise = await analyzePendingJobs(perfil)

  console.log(`Tempo análise: ${formatarDuracao(inicioAnalise)}s`)

  console.log(`Tempo total sincronização: ${formatarDuracao(inicioTotal)}s`)

  return {
    modo: {
      braveAutorizada: usarBrave,

      limiteBrave
    },

    fontes,

    web,

    analise: {
      analisadas: analise.analyzed,

      relevantes: analise.relevant,

      descartadas: analise.discarded
    }
  }
}
