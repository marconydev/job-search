import { collectors } from "../collectors/index.js"

import { refreshExistingJobs } from "../repositories/job-repository.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { analyzePendingJobs } from "./job-analysis.js"

import { coletarFontesAtsAprendidas } from "./fontes-ats.js"

import {
  filtrarVagasComDiagnosticoComYield,
  type DiagnosticoFiltragemVagas
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

  aoAtualizarEtapa?: (etapa: EtapaSincronizacao) => Promise<void> | void
}

/**
 * Eu mantenho uma rotação conservadora para caber no ambiente gratuito.
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

function registrarDiagnosticoFonte(fonte: string, diagnostico: DiagnosticoFiltragemVagas) {
  console.log(
    [
      `Funil fonte: ${fonte}`,
      `recebidas=${diagnostico.recebidas}`,
      `fora_janela=${diagnostico.foraDaJanela}`,
      `localizacao=${diagnostico.localizacaoIncompativel}`,
      `politica_brasil=${diagnostico.politicaBrasilIncompativel}`,
      `matcher=${diagnostico.matcherAbaixoDoMinimo}`,
      `score_0=${diagnostico.scoreZero}`,
      `score_1_39=${diagnostico.score1a39}`,
      `score_40_49=${diagnostico.score40a49}`,
      `score_50_59=${diagnostico.score50a59}`,
      `score_60_mais=${diagnostico.score60OuMais}`,
      `aderentes=${diagnostico.aderentes}`
    ].join(" | ")
  )

  for (const exemplo of diagnostico.exemplosQuaseAderentes) {
    console.log(
      `Quase aderente: ${fonte} | score=${exemplo.score} | ` +
        `${exemplo.title} | ${exemplo.company} | ${exemplo.reason}`
    )
  }
}

async function coletarFontesDiretas(
  perfil: PerfilProfissional,
  limite: number
): Promise<ResultadoFonte[]> {
  const resultados: ResultadoFonte[] = []

  for (const coletor of collectors) {
    const inicioFonte = agoraMs()

    try {
      const coleta = await coletor.collect(limite, perfil)

      /**
       * Eu atualizo vagas existentes antes do filtro para corrigir dados da
       * fonte mesmo quando a oportunidade deixa de ser aderente depois disso.
       */
      const atualizacao = await refreshExistingJobs(coleta.jobs)

      if (atualizacao.updated > 0 || atualizacao.invalidated > 0) {
        console.log(
          [
            `Fonte direta: ${coleta.source}`,
            `${atualizacao.updated} vaga(s) existente(s) atualizada(s),`,
            `${atualizacao.invalidated} marcada(s) para reanálise.`
          ].join(" ")
        )
      }

      const filtragem = await filtrarVagasComDiagnosticoComYield(coleta.jobs, perfil)

      registrarDiagnosticoFonte(coleta.source, filtragem.diagnostico)

      const vagasAderentes = filtragem.vagasAderentes

      const importacao = await importJobs({
        source: coleta.source,

        jobs: vagasAderentes
      })

      resultados.push({
        ...importacao,

        found: coleta.jobs.length,

        matched: vagasAderentes.length
      })

      console.log(
        [
          `Fonte direta: ${coleta.source}`,
          `${coleta.jobs.length} encontrada(s),`,
          `${vagasAderentes.length} aderente(s),`,
          `${importacao.inserted} nova(s),`,
          `${importacao.duplicates} duplicada(s),`,
          `tempo: ${formatarDuracao(inicioFonte)}s.`
        ].join(" ")
      )
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido durante a coleta"

      resultados.push({
        source: coletor.name,

        found: 0,

        matched: 0,

        inserted: 0,

        duplicates: 0,

        error: mensagem
      })
    }

    await cederEventLoop()
  }

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

  await atualizarEtapa(opcoes, "fontes_diretas")

  const inicioFontes = agoraMs()

  const fontesDiretas = await coletarFontesDiretas(perfil, limite)

  console.log(`Tempo fontes diretas: ${formatarDuracao(inicioFontes)}s`)

  await cederEventLoop()

  await atualizarEtapa(opcoes, "web")

  const inicioWeb = agoraMs()

  const web = await processarVagasWeb(perfil, {
    salvarCompativeis: true,

    permitirBuscaLive: usarBrave,

    limiteChamadasBrave: limiteBrave
  })

  console.log(`Tempo web/cache: ${formatarDuracao(inicioWeb)}s`)

  await cederEventLoop()

  await atualizarEtapa(opcoes, "ats")

  const inicioAts = agoraMs()

  const fontesAts = await coletarFontesAtsAprendidas(
    perfil,
    LIMITE_FONTES_ATS_POR_EXECUCAO,
    LIMITE_VAGAS_POR_FONTE_ATS
  )

  console.log(`Tempo ATS: ${formatarDuracao(inicioAts)}s`)

  const fontes: ResultadoFonte[] = [...fontesDiretas, ...fontesAts]

  await cederEventLoop()

  /**
   * Eu analiso somente o que está pendente para a versão atual:
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
