import { collectRemotiveJobs } from "../collectors/remotive.js"

import { analyzePendingJobs } from "./job-analysis.js"
import { importJobs } from "./job-import.js"

/**
 * Executa o ciclo completo de atualização das vagas.
 *
 * Primeiro coletamos e persistimos as oportunidades. Depois o matcher
 * analisa tudo que ainda estiver pendente no banco.
 */
export async function syncJobs(limit = 100) {
  const collection = await collectRemotiveJobs(limit)
  const imported = await importJobs(collection)

  // O analisador olha o banco inteiro atrás de pendências. Dessa forma,
  // uma execução interrompida ou um cadastro manual também é recuperado.
  const analysis = await analyzePendingJobs()

  return {
    source: imported.source,
    found: imported.found,
    inserted: imported.inserted,
    duplicates: imported.duplicates,
    analyzed: analysis.analyzed,
    relevant: analysis.relevant,
    discarded: analysis.discarded
  }
}