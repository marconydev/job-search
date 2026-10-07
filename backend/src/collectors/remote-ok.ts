import { gerarTermosBuscaPortugues, normalizarTexto } from "./collector-utils.js"

import type { JobCollection, JobCollector } from "../types/collector.js"

import type { NewJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

const URL_REMOTE_OK = "https://remoteok.com/api"

type RemoteOkJob = {
  id?: string | number

  slug?: string

  epoch?: number

  date?: string

  company?: string

  position?: string

  description?: string

  location?: string

  url?: string

  apply_url?: string
}

function normalizarData(vaga: RemoteOkJob) {
  if (vaga.date) {
    const data = new Date(vaga.date)

    if (!Number.isNaN(data.getTime())) {
      return data.toISOString()
    }
  }

  if (typeof vaga.epoch === "number" && Number.isFinite(vaga.epoch)) {
    return new Date(vaga.epoch * 1000).toISOString()
  }

  return null
}

function normalizarUrl(valor: string | undefined) {
  if (!valor) {
    return null
  }

  try {
    return new URL(valor, "https://remoteok.com").toString()
  } catch {
    return null
  }
}

function normalizarVaga(vaga: RemoteOkJob): NewJob | null {
  const id = vaga.id ?? vaga.slug

  const titulo = vaga.position?.trim()

  const empresa = vaga.company?.trim()

  const descricao = vaga.description?.trim()

  if (!id || !titulo || !empresa || !descricao) {
    return null
  }

  const url = normalizarUrl(vaga.url) ?? normalizarUrl(vaga.apply_url)

  if (!url) {
    return null
  }

  return {
    source: "remote-ok",

    externalId: String(id),

    company: empresa,

    title: titulo,

    description: descricao,

    location: vaga.location?.trim() || "Worldwide",

    remote: true,

    workplaceType: "remote",

    url,

    publishedAt: normalizarData(vaga)
  }
}

async function collectRemoteOkJobs(
  limit = 100,
  perfil?: PerfilProfissional
): Promise<JobCollection> {
  const response = await fetch(URL_REMOTE_OK, {
    headers: {
      Accept: "application/json",

      "User-Agent": "job-search-personal/1.0"
    }
  })

  if (!response.ok) {
    throw new Error(`Remote OK respondeu com status ${response.status}`)
  }

  const dados = (await response.json()) as RemoteOkJob[]

  const termos = perfil ? gerarTermosBuscaPortugues(perfil, 10).map(normalizarTexto) : []

  const jobs = dados
    .map(normalizarVaga)
    .filter((vaga): vaga is NewJob => vaga !== null)
    .filter(vaga => {
      if (termos.length === 0) {
        return true
      }
      const titulo = normalizarTexto(vaga.title)
      return termos.some(termo => titulo.includes(termo))
    })
    .slice(0, Math.max(0, limit))

  return {
    source: "remote-ok",

    jobs
  }
}

export const remoteOkCollector: JobCollector = {
  name: "remote-ok",

  collect: collectRemoteOkJobs
}
