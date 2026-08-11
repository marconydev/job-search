import { collectors } from "../collectors/index.js"

import { analyzePendingJobs } from "./job-analysis.js"
import {
  importJobs,
  type JobImportResult
} from "./job-import.js"

type SourceSyncResult = JobImportResult & {
  error?: string
}

/**
 * Executa todos os coletores registrados e salva as novas vagas.
 *
 * Uma falha em determinada fonte não deve impedir as demais de rodarem.
 * O erro fica registrado no resultado para sabermos qual integração falhou.
 */
async function collectAndImportJobs(limit: number) {
  const results: SourceSyncResult[] = []

  for (const collector of collectors) {
    try {
      const collection = await collector.collect(limit)
      const imported = await importJobs(collection)

      results.push(imported)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro desconhecido durante a coleta"

      console.error(
        `Falha ao coletar vagas de ${collector.name}:`,
        error
      )

      results.push({
        source: collector.name,
        found: 0,
        inserted: 0,
        duplicates: 0,
        error: message
      })
    }
  }

  return results
}

/**
 * Executa o ciclo completo do Job Search.
 *
 * Primeiro consultamos todas as fontes disponíveis. Depois analisamos
 * qualquer vaga que ainda esteja pendente no banco, inclusive cadastros
 * manuais ou importações interrompidas anteriormente.
 */
export async function syncJobs(limit = 100) {
  const sources = await collectAndImportJobs(limit)
  const analysis = await analyzePendingJobs()

  const totals = sources.reduce(
    (total, source) => {
      total.found += source.found
      total.inserted += source.inserted
      total.duplicates += source.duplicates

      return total
    },
    {
      found: 0,
      inserted: 0,
      duplicates: 0
    }
  )

  return {
    sources,
    totals: {
      ...totals,
      analyzed: analysis.analyzed,
      relevant: analysis.relevant,
      discarded: analysis.discarded
    }
  }
}