import { createJob, isDuplicateJobError } from "../repositories/job-repository.js"

import type { JobCollection } from "../types/collector.js"

export type JobImportResult = {
  source: string
  found: number
  inserted: number
  duplicates: number
}

/**
 * Salva no banco as vagas entregues por qualquer coletor.
 *
 * O coletor cuida apenas de buscar e normalizar os dados. A partir daqui
 * o processo de persistência é o mesmo, independentemente da fonte.
 */
export async function importJobs(collection: JobCollection): Promise<JobImportResult> {
  let inserted = 0
  let duplicates = 0

  for (const job of collection.jobs) {
    try {
      await createJob(job)
      inserted++
    } catch (error) {
      // Encontrar novamente uma vaga já salva é esperado nas coletas diárias.
      // Outros erros continuam subindo para não esconder falhas reais.
      if (isDuplicateJobError(error)) {
        duplicates++
        continue
      }

      throw error
    }
  }

  return {
    source: collection.source,
    found: collection.jobs.length,
    inserted,
    duplicates
  }
}
