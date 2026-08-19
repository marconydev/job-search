import { collectors } from "../collectors/index.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { reanalisarTodasAsVagas } from "./job-analysis.js"

import { coletarFontesAtsAprendidas, registrarFontesAtsDosJobsExistentes } from "./fontes-ats.js"

import { filtrarVagasAderentes } from "./filtragem-vagas.js"

import { importJobs, type JobImportResult } from "./job-import.js"

import { processarVagasWeb } from "./processamento-vagas-web.js"

type ResultadoFonte = JobImportResult & {
  /**
   * Quantidade que passou pelo matcher antes da persistência.
   */
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
 * No ambiente gratuito eu prefiro distribuir a coleta ATS entre várias
 * execuções em vez de tentar processar todos os boards de uma vez.
 *
 * O repositório já prioriza fontes nunca consultadas e depois as mais
 * antigas, portanto essa redução preserva a rotação.
 */
const LIMITE_FONTES_ATS_POR_EXECUCAO = 12

const LIMITE_VAGAS_POR_FONTE_ATS = 200

async function atualizarEtapa(opcoes: OpcoesSincronizacao, etapa: EtapaSincronizacao) {
  if (opcoes.aoAtualizarEtapa) {
    await opcoes.aoAtualizarEtapa(etapa)
  }
}

/**
 * Primeiro consulto as fontes que podem ser acessadas diretamente,
 * sem gastar chamadas da Brave.
 *
 * Alguns coletores globais ignoram o perfil.
 * Portais agregadores nativos, como Gupy, usam o perfil para fazer
 * pesquisas pelos cargos individualmente.
 */
async function coletarFontesDiretas(
  perfil: PerfilProfissional,
  limite: number
): Promise<ResultadoFonte[]> {
  const resultados: ResultadoFonte[] = []

  for (const coletor of collectors) {
    try {
      const coleta = await coletor.collect(limite, perfil)

      const vagasAderentes = filtrarVagasAderentes(coleta.jobs, perfil)

      const importacao = await importJobs({
        source: coleta.source,

        jobs: vagasAderentes
      })

      resultados.push({
        ...importacao,

        /**
         * found representa tudo que a fonte retornou.
         */
        found: coleta.jobs.length,

        /**
         * matched representa somente o que o matcher aceitou.
         */
        matched: vagasAderentes.length
      })

      console.log(
        [
          `Fonte direta: ${coleta.source}`,
          `${coleta.jobs.length} encontrada(s),`,
          `${vagasAderentes.length} aderente(s),`,
          `${importacao.inserted} nova(s),`,
          `${importacao.duplicates} duplicada(s).`
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
  const usarBrave = opcoes.usarBrave === true

  const limiteBrave = usarBrave ? normalizarLimiteBrave(opcoes.limiteChamadasBrave) : 0

  console.log("")

  console.log(
    usarBrave
      ? `Sincronização: Brave autorizada com limite de ${limiteBrave} chamada(s).`
      : "Sincronização: Brave desativada. Usando fontes diretas, ATS aprendidos e cache."
  )

  /**
   * Primeiro consulto as fontes nativas sem custo Brave.
   *
   * A Gupy passa a entrar nesta etapa.
   */
  await atualizarEtapa(opcoes, "fontes_diretas")

  const fontesDiretas = await coletarFontesDiretas(perfil, limite)

  /**
   * Reaproveito vagas existentes para aprender boards sem consumir Brave.
   */
  await registrarFontesAtsDosJobsExistentes()

  /**
   * Depois processo o cache web ou executo Brave quando autorizada.
   *
   * A Brave continua ativa como camada complementar, mas não é mais
   * responsável pela cobertura principal da Gupy.
   */
  await atualizarEtapa(opcoes, "web")

  const web = await processarVagasWeb(perfil, {
    salvarCompativeis: true,

    permitirBuscaLive: usarBrave,

    limiteChamadasBrave: limiteBrave
  })

  /**
   * O processamento web pode ter descoberto novas empresas.
   *
   * Eu consulto um subconjunto das fontes aprendidas por rodada para
   * manter o consumo de memória e CPU adequado ao ambiente gratuito.
   */
  await atualizarEtapa(opcoes, "ats")

  const fontesAts = await coletarFontesAtsAprendidas(
    perfil,
    LIMITE_FONTES_ATS_POR_EXECUCAO,
    LIMITE_VAGAS_POR_FONTE_ATS
  )

  const fontes: ResultadoFonte[] = [...fontesDiretas, ...fontesAts]

  /**
   * Por último reanaliso também os registros antigos.
   *
   * As regras de localização e de cargo podem evoluir. Se eu analisasse
   * somente vagas pendentes, oportunidades estrangeiras ou falsos
   * positivos já classificados continuariam aparecendo no dashboard.
   */
  await atualizarEtapa(opcoes, "analise")

  const analise = await reanalisarTodasAsVagas(perfil)

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