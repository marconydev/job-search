import { collectors } from "../collectors/index.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { analyzePendingJobs } from "./job-analysis.js"

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

type OpcoesSincronizacao = {
  usarBrave?: boolean

  limiteChamadasBrave?: number
}

/**
 * Eu consulto as APIs globais e filtro as oportunidades antes de
 * permitir qualquer INSERT no PostgreSQL.
 */
async function coletarFontesDiretas(
  perfil: PerfilProfissional,
  limite: number
): Promise<ResultadoFonte[]> {
  const resultados: ResultadoFonte[] = []

  for (const coletor of collectors) {
    try {
      const coleta = await coletor.collect(limite)

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
   * Primeiro consulto as APIs globais sem custo Brave.
   */
  const fontesDiretas = await coletarFontesDiretas(perfil, limite)

  /**
   * Também reaproveito as vagas que já existem no banco para aprender
   * boards de ATS sem depender de uma nova busca web.
   */
  await registrarFontesAtsDosJobsExistentes()

  /**
   * Depois processo o cache web ou executo Brave quando autorizada.
   */
  const web = await processarVagasWeb(perfil, {
    salvarCompativeis: true,

    permitirBuscaLive: usarBrave,

    limiteChamadasBrave: limiteBrave
  })

  /**
   * O processamento web pode ter descoberto novas empresas.
   *
   * Por isso consulto os ATS depois dele.
   */
  const fontesAts = await coletarFontesAtsAprendidas(perfil, 40, 500)

  const fontes: ResultadoFonte[] = [...fontesDiretas, ...fontesAts]

  /**
   * Somente depois de todas as entradas terem sido concluídas eu analiso
   * os registros que ainda não possuem job_match.
   */
  const analise = await analyzePendingJobs(perfil)

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
