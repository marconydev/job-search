import { fetchComTimeout } from "./collector-utils.js"

import type { JobCollection, JobCollector } from "../types/collector.js"

import type { NewJob } from "../types/job.js"

const URL_JOBICY = "https://jobicy.com/api/v2/remote-jobs"

const LIMITE_MAXIMO_API = 200

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

function normalizarLimite(valor: number | undefined) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return 100
  }

  return Math.min(Math.max(Math.floor(valor), 1), LIMITE_MAXIMO_API)
}

/**
 * Eu filtro a própria API da Jobicy para vagas cuja elegibilidade inclui
 * o Brasil. Assim deixo de baixar uma amostra global para descartar quase
 * tudo depois por localização.
 *
 * O matcher continua responsável por cargo e competências para não
 * transformar a integração da fonte em uma segunda regra de aderência.
 */
export function montarUrlBuscaJobicy(limit = 100) {
  const url = new URL(URL_JOBICY)

  url.searchParams.set("count", String(normalizarLimite(limit)))

  url.searchParams.set("geo", "brazil")

  return url
}

export async function collectJobicyJobs(limit = 100): Promise<JobCollection> {
  const limite = normalizarLimite(limit)

  const url = montarUrlBuscaJobicy(limite)

  const response = await fetchComTimeout(url, {
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
    .slice(0, limite)

  console.log(`Jobicy: consulta remota direcionada ao Brasil, ${jobs.length} vaga(s) coletada(s).`)

  return {
    source: "jobicy",

    jobs
  }
}

export const jobicyCollector: JobCollector = {
  name: "jobicy",

  collect: collectJobicyJobs
}
