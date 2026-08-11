import type { JobCollection } from "../types/collector.js"
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
 * Converte uma vaga da Remotive para o formato usado internamente.
 *
 * A partir daqui o restante do sistema não precisa conhecer nomes como
 * company_name ou candidate_required_location.
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

/**
 * Busca vagas na Remotive e devolve somente dados normalizados.
 *
 * Salvar no banco não é responsabilidade do coletor. Isso permite que
 * todas as fontes usem o mesmo tratamento de duplicidade e persistência.
 */
export async function collectRemotiveJobs(
  limit = 100
): Promise<JobCollection> {
  const url = new URL(REMOTIVE_API_URL)

  url.searchParams.set("limit", String(limit))

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      `Remotive respondeu com status ${response.status}`
    )
  }

  const data = (await response.json()) as RemotiveResponse

  const jobs = data.jobs.map(normalizeJob)

  return {
    source: "remotive",
    jobs
  }
}