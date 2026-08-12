import {
  collectors
} from "../collectors/index.js"

import {
  analyzePendingJobs
} from "./job-analysis.js"

import {
  importJobs,
  type JobImportResult
} from "./job-import.js"

import {
  processarVagasWeb
} from "./processamento-vagas-web.js"

type ResultadoFonte =
  JobImportResult & {
    error?: string
  }

async function coletarFontesDiretas(
  limite: number
) {
  const resultados:
    ResultadoFonte[] = []

  for (
    const coletor
    of collectors
  ) {
    try {
      const coleta =
        await coletor.collect(
          limite
        )

      const importacao =
        await importJobs(
          coleta
        )

      resultados.push(
        importacao
      )
    } catch (erro) {
      const mensagem =
        erro instanceof Error
          ? erro.message
          : "Erro desconhecido durante a coleta"

      resultados.push({
        source:
          coletor.name,

        found: 0,
        inserted: 0,
        duplicates: 0,
        error:
          mensagem
      })
    }
  }

  return resultados
}

/**
 * Executo todo o Job Search por um único ponto de entrada.
 *
 * A busca web fica autorizada aqui porque este é o comando real de
 * sincronização, mas o serviço de descoberta continua impondo o limite
 * diário de seis chamadas Brave.
 */
export async function syncJobs(
  limite = 100
) {
  const fontes =
    await coletarFontesDiretas(
      limite
    )

  const web =
    await processarVagasWeb({
      salvarCompativeis:
        true,

      permitirBuscaLive:
        true,

      limiteChamadasBrave:
        6
    })

  const analise =
    await analyzePendingJobs()

  return {
    fontes,
    web,

    analise: {
      analisadas:
        analise.analyzed,

      relevantes:
        analise.relevant,

      descartadas:
        analise.discarded
    }
  }
}