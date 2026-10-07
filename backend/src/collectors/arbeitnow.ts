import { gerarTermosBuscaPortugues, normalizarTexto } from "./collector-utils.js"

import type { JobCollection, JobCollector } from "../types/collector.js"

import type { NewJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

const URL_ARBEITNOW = "https://www.arbeitnow.com/api/job-board-api"

type ArbeitnowJob = {
  slug?: string

  company_name?: string

  title?: string

  description?: string

  remote?: boolean

  url?: string

  location?: string

  created_at?: string | number
}

type ArbeitnowResponse = {
  data?: ArbeitnowJob[]

  links?: {
    next?: string | null
  }
}

function normalizarData(valor: string | number | undefined) {
  if (valor === undefined) {
    return null
  }

  const data = typeof valor === "number" ? new Date(valor * 1000) : new Date(valor)

  return Number.isNaN(data.getTime()) ? null : data.toISOString()
}

function normalizarVaga(vaga: ArbeitnowJob): NewJob | null {
  const id = vaga.slug?.trim()

  const titulo = vaga.title?.trim()

  const empresa = vaga.company_name?.trim()

  const descricao = vaga.description?.trim()

  const url = vaga.url?.trim()

  if (!id || !titulo || !empresa || !descricao || !url) {
    return null
  }

  return {
    source: "arbeitnow",

    externalId: id,

    company: empresa,

    title: titulo,

    description: descricao,

    location: vaga.location?.trim() || null,

    remote: vaga.remote === true,

    workplaceType: vaga.remote === true ? "remote" : "unknown",

    url,

    publishedAt: normalizarData(vaga.created_at)
  }
}

async function collectArbeitnowJobs(
  limit = 100,
  perfil?: PerfilProfissional
): Promise<JobCollection> {
  const termos = perfil ? gerarTermosBuscaPortugues(perfil, 10).map(normalizarTexto) : []

  const jobs: NewJob[] = []

  let proximaUrl: string | null = URL_ARBEITNOW

  let paginas = 0

  /**
   * Evito uma paginação infinita caso o serviço devolva um link
   * inconsistente.
   */
  while (proximaUrl && jobs.length < limit && paginas < 5) {
    paginas++

    const response = await fetch(proximaUrl, {
      headers: {
        Accept: "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Arbeitnow respondeu com status ${response.status}`)
    }

    const dados = (await response.json()) as ArbeitnowResponse

    for (const vaga of dados.data ?? []) {
      const normalizada = normalizarVaga(vaga)

      if (!normalizada) {
        continue
      }

      if (termos.length > 0) {
        const titulo = normalizarTexto(normalizada.title)
        if (!termos.some(termo => titulo.includes(termo))) {
          continue
        }
      }

      jobs.push(normalizada)

      if (jobs.length >= limit) {
        break
      }
    }

    proximaUrl = dados.links?.next ?? null
  }

  return {
    source: "arbeitnow",

    jobs
  }
}

export const arbeitnowCollector: JobCollector = {
  name: "arbeitnow",

  collect: collectArbeitnowJobs
}
