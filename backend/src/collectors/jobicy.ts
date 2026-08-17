import type { JobCollection, JobCollector } from "../types/collector.js"

import type { NewJob } from "../types/job.js"

const URL_JOBICY = "https://jobicy.com/api/v2/remote-jobs"

type JobicyJob = {
  id: number | string

  url: string

  jobTitle: string

  companyName: string

  jobGeo?: string

  jobExcerpt?: string

  jobDescription?: string

  pubDate?: string
}

type JobicyResponse = {
  jobs?: JobicyJob[]
}

function normalizarData(valor: string | undefined) {
  if (!valor) {
    return null
  }

  const data = new Date(valor)

  return Number.isNaN(data.getTime()) ? null : data.toISOString()
}

function normalizarVaga(vaga: JobicyJob): NewJob | null {
  const titulo = vaga.jobTitle?.trim()

  const empresa = vaga.companyName?.trim()

  const descricao = vaga.jobDescription?.trim() || vaga.jobExcerpt?.trim()

  const url = vaga.url?.trim()

  if (!vaga.id || !titulo || !empresa || !descricao || !url) {
    return null
  }

  return {
    source: "jobicy",

    externalId: String(vaga.id),

    company: empresa,

    title: titulo,

    description: descricao,

    location: vaga.jobGeo?.trim() || "Anywhere",

    remote: true,

    url,

    publishedAt: normalizarData(vaga.pubDate)
  }
}

export async function collectJobicyJobs(limit = 100): Promise<JobCollection> {
  const url = new URL(URL_JOBICY)

  url.searchParams.set("count", String(Math.min(Math.max(limit, 1), 100)))

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  })

  if (!response.ok) {
    throw new Error(`Jobicy respondeu com status ${response.status}`)
  }

  const dados = (await response.json()) as JobicyResponse

  const jobs = (dados.jobs ?? [])
    .map(normalizarVaga)
    .filter((vaga): vaga is NewJob => vaga !== null)

  return {
    source: "jobicy",

    jobs
  }
}

export const jobicyCollector: JobCollector = {
  name: "jobicy",

  collect: collectJobicyJobs
}
