import type { JobCollection, JobCollector } from "../types/collector.js"

import type { NewJob } from "../types/job.js"

const REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs"

type RemotiveJob = {
  id: number
  url: string
  title: string
  company_name: string
  publication_date: string
  candidate_required_location: string
  description: string
}

type RemotiveResponse = {
  jobs: RemotiveJob[]
}

/**
 * Traduz o formato da Remotive para o modelo usado pelo Job Search.
 *
 * Manter essa conversão dentro do coletor evita que o restante do sistema
 * precise conhecer campos específicos de cada plataforma.
 */
function normalizeJob(job: RemotiveJob): NewJob {
  return {
    source: "remotive",
    externalId: String(job.id),
    company: job.company_name,
    title: job.title,
    description: job.description,
    location: job.candidate_required_location || null,
    remote: true,
    url: job.url,
    publishedAt: job.publication_date || null
  }
}

export async function collectRemotiveJobs(limit = 100): Promise<JobCollection> {
  const url = new URL(REMOTIVE_API_URL)

  url.searchParams.set("limit", String(limit))

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Remotive respondeu com status ${response.status}`)
  }

  const data = (await response.json()) as RemotiveResponse

  return {
    source: "remotive",
    jobs: data.jobs.map(normalizeJob)
  }
}

/**
 * O sincronizador trabalha com coletores através desta estrutura comum.
 * Assim podemos adicionar novas fontes sem criar regras específicas nele.
 */
export const remotiveCollector: JobCollector = {
  name: "remotive",
  collect: collectRemotiveJobs
}
