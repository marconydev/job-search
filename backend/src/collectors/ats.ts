import { createHash } from "node:crypto"

import type { JobCollection } from "../types/collector.js"

import type { FonteAts } from "../types/fonte-ats.js"

import type { NewJob } from "../types/job.js"

function normalizarData(valor: string | number | null | undefined) {
  if (valor === null || valor === undefined) {
    return null
  }

  const data = typeof valor === "number" ? new Date(valor) : new Date(String(valor))

  return Number.isNaN(data.getTime()) ? null : data.toISOString()
}

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Eu trato modalidade estruturada sem depender de maiúsculas/minúsculas.
 *
 * Não considero híbrido como remoto e não tento inferir modalidade a
 * partir da descrição livre da vaga.
 */
function modalidadeEhRemota(valor: string | null | undefined) {
  const normalizado = normalizarTexto(valor)

  return new Set([
    "remote",
    "remoto",
    "remota",
    "fully remote",
    "full remote",
    "100% remote",
    "home office"
  ]).has(normalizado)
}

function localizacaoPareceRemota(valor: string | null | undefined) {
  if (!valor) {
    return false
  }

  const texto = normalizarTexto(valor)

  return ["remote", "remoto", "remota", "home office", "worldwide", "anywhere"].some(termo =>
    texto.includes(termo)
  )
}

function criarIdWeb(url: string) {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 48)

  return `web_${hash}`
}

function slugificar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
}

function nomeResultado(fonte: FonteAts) {
  return `ats:${fonte.provedor}:${fonte.identificador}`
}

/**
 * Chave interna e estável do board.
 *
 * A variante participa da chave para que, por exemplo, um board Lever
 * europeu e um global nunca sejam reconciliados como se fossem a mesma
 * origem.
 */
function chaveFonte(fonte: FonteAts) {
  return `ats:${fonte.provedor}:${fonte.variante}:${fonte.identificador}`
}

function criarColecaoAts(fonte: FonteAts, jobs: NewJob[], complete: boolean): JobCollection {
  return {
    source: nomeResultado(fonte),

    sourceKey: chaveFonte(fonte),

    complete,

    jobs
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Greenhouse                                */
/* -------------------------------------------------------------------------- */

type GreenhouseBoard = {
  name?: string
}

type GreenhouseJob = {
  id: number

  title: string

  location?: {
    name?: string
  }

  updated_at?: string

  absolute_url?: string

  content?: string
}

type GreenhouseResponse = {
  jobs?: GreenhouseJob[]
}

async function coletarGreenhouse(fonte: FonteAts, limite: number): Promise<JobCollection> {
  const token = encodeURIComponent(fonte.identificador)

  const urlBoard = `https://boards-api.greenhouse.io/v1/boards/${token}`

  const urlJobs = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`

  const [respostaBoard, respostaJobs] = await Promise.all([
    fetch(urlBoard, {
      headers: {
        Accept: "application/json"
      }
    }),

    fetch(urlJobs, {
      headers: {
        Accept: "application/json"
      }
    })
  ])

  if (!respostaJobs.ok) {
    throw new Error(`Greenhouse ${fonte.identificador} respondeu com status ${respostaJobs.status}`)
  }

  let empresa = fonte.identificador

  if (respostaBoard.ok) {
    const board = (await respostaBoard.json()) as GreenhouseBoard

    empresa = board.name?.trim() || empresa
  }

  const dados = (await respostaJobs.json()) as GreenhouseResponse

  const vagasBrutas = dados.jobs ?? []

  const jobs = vagasBrutas
    .slice(0, limite)
    .map(vaga => {
      const titulo = vaga.title?.trim()

      const url = vaga.absolute_url?.trim()

      if (!titulo || !url) {
        return null
      }

      const localizacao = vaga.location?.name?.trim() || null

      return {
        source: "greenhouse",

        externalId: String(vaga.id),

        company: empresa,

        title: titulo,

        description: vaga.content?.trim() || titulo,

        location: localizacao,

        remote: localizacaoPareceRemota(localizacao),

        url,

        publishedAt: normalizarData(vaga.updated_at)
      } satisfies NewJob
    })
    .filter((vaga): vaga is NewJob => vaga !== null)

  return criarColecaoAts(fonte, jobs, vagasBrutas.length <= limite)
}

/* -------------------------------------------------------------------------- */
/*                                    Lever                                   */
/* -------------------------------------------------------------------------- */

type LeverJob = {
  id?: string

  text?: string

  country?: string | null

  categories?: {
    location?: string

    allLocations?: string[]
  }

  description?: string

  descriptionPlain?: string

  openingPlain?: string

  hostedUrl?: string

  applyUrl?: string

  workplaceType?: string
}

async function coletarLever(fonte: FonteAts, limite: number): Promise<JobCollection> {
  const base = fonte.variante === "eu" ? "https://api.eu.lever.co" : "https://api.lever.co"

  const jobs: NewJob[] = []

  let skip = 0

  let complete = false

  const tamanhoPagina = 100

  while (jobs.length < limite) {
    const limitePagina = Math.min(tamanhoPagina, limite - jobs.length)

    const url = new URL(`${base}/v0/postings/${encodeURIComponent(fonte.identificador)}`)

    url.searchParams.set("mode", "json")

    url.searchParams.set("skip", String(skip))

    url.searchParams.set("limit", String(limitePagina))

    const resposta = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    })

    if (!resposta.ok) {
      throw new Error(`Lever ${fonte.identificador} respondeu com status ${resposta.status}`)
    }

    const pagina = (await resposta.json()) as LeverJob[]

    for (const vaga of pagina) {
      const id = vaga.id?.trim()

      const titulo = vaga.text?.trim()

      const urlVaga = vaga.hostedUrl?.trim() || vaga.applyUrl?.trim()

      if (!id || !titulo || !urlVaga) {
        continue
      }

      const localizacao =
        vaga.categories?.allLocations?.filter(Boolean).join(" | ") ||
        vaga.categories?.location?.trim() ||
        vaga.country?.trim() ||
        null

      jobs.push({
        source: "lever",

        externalId: id,

        company: fonte.identificador,

        title: titulo,

        description:
          vaga.descriptionPlain?.trim() ||
          vaga.description?.trim() ||
          vaga.openingPlain?.trim() ||
          titulo,

        location: localizacao,

        remote: modalidadeEhRemota(vaga.workplaceType) || localizacaoPareceRemota(localizacao),

        url: urlVaga,

        /**
         * A API pública da Lever não fornece uma data confiável de
         * publicação nesta resposta. Não inventamos created_at como se
         * fosse publishedAt.
         */
        publishedAt: null
      })

      if (jobs.length >= limite) {
        break
      }
    }

    if (pagina.length < limitePagina) {
      complete = true

      break
    }

    if (jobs.length >= limite) {
      break
    }

    skip += pagina.length
  }

  return criarColecaoAts(fonte, jobs, complete)
}

/* -------------------------------------------------------------------------- */
/*                                  Workable                                  */
/* -------------------------------------------------------------------------- */

type WorkableJob = {
  title?: string

  code?: string

  shortcode?: string

  country?: string

  state?: string

  city?: string

  telecommuting?: boolean

  workplace_type?: string

  published_on?: string

  created_at?: string

  url?: string

  application_url?: string

  shortlink?: string

  description?: string
}

type WorkableResponse = {
  name?: string

  jobs?: WorkableJob[]
}

async function coletarWorkable(fonte: FonteAts, limite: number): Promise<JobCollection> {
  const url = new URL(
    `https://www.workable.com/api/accounts/${encodeURIComponent(fonte.identificador)}`
  )

  url.searchParams.set("details", "true")

  const resposta = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  })

  if (!resposta.ok) {
    throw new Error(`Workable ${fonte.identificador} respondeu com status ${resposta.status}`)
  }

  const dados = (await resposta.json()) as WorkableResponse

  const empresa = dados.name?.trim() || fonte.identificador

  const vagasBrutas = dados.jobs ?? []

  const jobs = vagasBrutas
    .slice(0, limite)
    .map(vaga => {
      const titulo = vaga.title?.trim()

      const urlVaga = vaga.application_url?.trim() || vaga.shortlink?.trim() || vaga.url?.trim()

      if (!titulo || !urlVaga) {
        return null
      }

      const id = vaga.code?.trim() || vaga.shortcode?.trim() || criarIdWeb(urlVaga)

      const localizacao = [vaga.city, vaga.state, vaga.country].filter(Boolean).join(", ") || null

      return {
        source: "workable",

        externalId: id,

        company: empresa,

        title: titulo,

        description: vaga.description?.trim() || titulo,

        location: localizacao,

        remote:
          vaga.telecommuting === true ||
          modalidadeEhRemota(vaga.workplace_type) ||
          localizacaoPareceRemota(localizacao),

        url: urlVaga,

        publishedAt: normalizarData(vaga.published_on ?? vaga.created_at)
      } satisfies NewJob
    })
    .filter((vaga): vaga is NewJob => vaga !== null)

  return criarColecaoAts(fonte, jobs, vagasBrutas.length <= limite)
}

/* -------------------------------------------------------------------------- */
/*                                    Ashby                                   */
/* -------------------------------------------------------------------------- */

type AshbyJob = {
  title?: string

  location?: string

  secondaryLocations?: Array<{
    location?: string
  }>

  isRemote?: boolean

  workplaceType?: string

  descriptionHtml?: string

  descriptionPlain?: string

  publishedAt?: string

  jobUrl?: string

  applyUrl?: string

  isListed?: boolean
}

type AshbyResponse = {
  jobs?: AshbyJob[]
}

async function coletarAshby(fonte: FonteAts, limite: number): Promise<JobCollection> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(fonte.identificador)}`

  const resposta = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  })

  if (!resposta.ok) {
    throw new Error(`Ashby ${fonte.identificador} respondeu com status ${resposta.status}`)
  }

  const dados = (await resposta.json()) as AshbyResponse

  const vagasListadas = (dados.jobs ?? []).filter(vaga => vaga.isListed !== false)

  const jobs = vagasListadas
    .slice(0, limite)
    .map(vaga => {
      const titulo = vaga.title?.trim()

      const urlVaga = vaga.jobUrl?.trim() || vaga.applyUrl?.trim()

      if (!titulo || !urlVaga) {
        return null
      }

      const localizacoes = [
        vaga.location,

        ...(vaga.secondaryLocations ?? []).map(item => item.location)
      ].filter((valor): valor is string => Boolean(valor))

      const localizacao = [...new Set(localizacoes)].join(" | ") || null

      return {
        source: "ashby",

        /**
         * Ashby não fornece um ID separado na API pública.
         *
         * Utilizo o mesmo padrão de hash empregado nas descobertas
         * web para manter o identificador estável.
         */
        externalId: criarIdWeb(urlVaga),

        company: fonte.identificador,

        title: titulo,

        description: vaga.descriptionPlain?.trim() || vaga.descriptionHtml?.trim() || titulo,

        location: localizacao,

        remote:
          vaga.isRemote === true ||
          modalidadeEhRemota(vaga.workplaceType) ||
          localizacaoPareceRemota(localizacao),

        url: urlVaga,

        publishedAt: normalizarData(vaga.publishedAt)
      } satisfies NewJob
    })
    .filter((vaga): vaga is NewJob => vaga !== null)

  return criarColecaoAts(fonte, jobs, vagasListadas.length <= limite)
}

/* -------------------------------------------------------------------------- */
/*                                  Recruitee                                 */
/* -------------------------------------------------------------------------- */

type RecruiteeLocation = {
  name?: string

  full_address?: string

  city?: string

  country?: string
}

type RecruiteeOffer = {
  id?: number | string

  slug?: string

  title?: string

  description?: string

  requirements?: string

  company_name?: string

  careers_url?: string

  careers_apply_url?: string

  published_at?: string

  created_at?: string

  updated_at?: string

  remote?: boolean

  workplace_type?: string

  locations?: RecruiteeLocation[]
}

type RecruiteeResponse = {
  offers?: RecruiteeOffer[]
}

function localizacaoRecruitee(oferta: RecruiteeOffer) {
  const localizacoes = (oferta.locations ?? [])
    .map(
      localizacao =>
        localizacao.full_address?.trim() ||
        localizacao.name?.trim() ||
        [localizacao.city, localizacao.country].filter(Boolean).join(", ")
    )
    .filter(Boolean)

  return [...new Set(localizacoes)].join(" | ") || null
}

async function coletarRecruitee(fonte: FonteAts, limite: number): Promise<JobCollection> {
  const url = `https://${fonte.identificador}.recruitee.com/api/offers/`

  const resposta = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  })

  if (!resposta.ok) {
    throw new Error(`Recruitee ${fonte.identificador} respondeu com status ${resposta.status}`)
  }

  const dados = (await resposta.json()) as RecruiteeResponse

  const ofertas = dados.offers ?? []

  const jobs = ofertas
    .slice(0, limite)
    .map(oferta => {
      const titulo = oferta.title?.trim()

      const slug = oferta.slug?.trim()

      const urlVaga =
        oferta.careers_url?.trim() ||
        oferta.careers_apply_url?.trim() ||
        (slug ? `https://${fonte.identificador}.recruitee.com/o/${slug}` : null)

      if (!titulo || !urlVaga) {
        return null
      }

      const localizacao = localizacaoRecruitee(oferta)

      const descricao =
        [oferta.description, oferta.requirements].filter(Boolean).join("\n\n").trim() || titulo

      return {
        source: "recruitee",

        externalId: oferta.id ? String(oferta.id) : criarIdWeb(urlVaga),

        company: oferta.company_name?.trim() || fonte.identificador,

        title: titulo,

        description: descricao,

        location: localizacao,

        remote:
          oferta.remote === true ||
          modalidadeEhRemota(oferta.workplace_type) ||
          localizacaoPareceRemota(localizacao),

        url: urlVaga,

        publishedAt: normalizarData(oferta.published_at ?? oferta.created_at ?? oferta.updated_at)
      } satisfies NewJob
    })
    .filter((vaga): vaga is NewJob => vaga !== null)

  return criarColecaoAts(fonte, jobs, ofertas.length <= limite)
}

/* -------------------------------------------------------------------------- */
/*                                   InHire                                   */
/* -------------------------------------------------------------------------- */

type InHireJob = {
  jobId?: string | number

  displayName?: string

  workplaceType?: string

  location?: string

  status?: string

  description?: string

  descriptionHtml?: string
}

type InHireResponse = {
  tenantName?: string

  jobsPage?: InHireJob[]
}

function vagaInHireEstaPublicada(vaga: InHireJob) {
  const status = normalizarTexto(vaga.status)

  return status === "" || status === "published"
}

async function coletarInHire(fonte: FonteAts, limite: number): Promise<JobCollection> {
  const resposta = await fetch("https://api.inhire.app/job-posts/public/pages", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Inhire-Client": "web-inhire",
      "X-Tenant": fonte.identificador
    }
  })

  if (!resposta.ok) {
    throw new Error(`InHire ${fonte.identificador} respondeu com status ${resposta.status}`)
  }

  const dados = (await resposta.json()) as InHireResponse | unknown[]

  /**
   * A API pública responde com array para um slug que não representa um
   * tenant válido. Não trato esse retorno como um board vazio porque isso
   * poderia encerrar vagas existentes indevidamente.
   */
  if (Array.isArray(dados)) {
    throw new Error(`InHire ${fonte.identificador} não retornou um tenant válido`)
  }

  const empresa = dados.tenantName?.trim() || fonte.identificador

  const vagasPublicadas = (dados.jobsPage ?? []).filter(vagaInHireEstaPublicada)

  const jobs = vagasPublicadas
    .slice(0, limite)
    .map<NewJob | null>(vaga => {
      const id = vaga.jobId === null || vaga.jobId === undefined ? "" : String(vaga.jobId).trim()

      const titulo = vaga.displayName?.trim()

      if (!id || !titulo) {
        return null
      }

      const localizacao = vaga.location?.trim() || null

      const slug = slugificar(titulo)

      const url = `https://${fonte.identificador}.inhire.app/vagas/${encodeURIComponent(id)}${
        slug ? `/${slug}` : ""
      }`

      return {
        source: "inhire",

        externalId: id,

        company: empresa,

        title: titulo,

        description: vaga.description?.trim() || vaga.descriptionHtml?.trim() || titulo,

        location: localizacao,

        remote:
          modalidadeEhRemota(vaga.workplaceType) || localizacaoPareceRemota(localizacao),

        url,

        /**
         * O contrato público validado não fornece uma data de publicação
         * confiável. Prefiro deixar nulo a transformar outra data em
         * publishedAt.
         */
        publishedAt: null
      } satisfies NewJob
    })
    .filter((vaga): vaga is NewJob => vaga !== null)

  return criarColecaoAts(fonte, jobs, vagasPublicadas.length <= limite)
}

/* -------------------------------------------------------------------------- */

export async function coletarFonteAts(fonte: FonteAts, limite = 500): Promise<JobCollection> {
  switch (fonte.provedor) {
    case "greenhouse":
      return coletarGreenhouse(fonte, limite)

    case "lever":
      return coletarLever(fonte, limite)

    case "workable":
      return coletarWorkable(fonte, limite)

    case "ashby":
      return coletarAshby(fonte, limite)

    case "recruitee":
      return coletarRecruitee(fonte, limite)

    case "inhire":
      return coletarInHire(fonte, limite)
  }
}
