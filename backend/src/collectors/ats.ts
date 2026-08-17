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

function localizacaoPareceRemota(valor: string | null | undefined) {
  if (!valor) {
    return false
  }

  const texto = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  return ["remote", "remoto", "remota", "home office", "worldwide", "anywhere"].some(termo =>
    texto.includes(termo)
  )
}

function criarIdWeb(url: string) {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 48)

  return `web_${hash}`
}

function nomeResultado(fonte: FonteAts) {
  return `ats:${fonte.provedor}:${fonte.identificador}`
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

  const jobs = (dados.jobs ?? [])
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

  return {
    source: nomeResultado(fonte),

    jobs
  }
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

  const tamanhoPagina = 100

  while (jobs.length < limite) {
    const url = new URL(`${base}/v0/postings/${encodeURIComponent(fonte.identificador)}`)

    url.searchParams.set("mode", "json")

    url.searchParams.set("skip", String(skip))

    url.searchParams.set("limit", String(Math.min(tamanhoPagina, limite - jobs.length)))

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

        remote: vaga.workplaceType === "remote" || localizacaoPareceRemota(localizacao),

        url: urlVaga,

        publishedAt: null
      })

      if (jobs.length >= limite) {
        break
      }
    }

    if (pagina.length < tamanhoPagina) {
      break
    }

    skip += pagina.length
  }

  return {
    source: nomeResultado(fonte),

    jobs
  }
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

  const jobs = (dados.jobs ?? [])
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

        remote: vaga.telecommuting === true || vaga.workplace_type === "remote",

        url: urlVaga,

        publishedAt: normalizarData(vaga.published_on ?? vaga.created_at)
      } satisfies NewJob
    })
    .filter((vaga): vaga is NewJob => vaga !== null)

  return {
    source: nomeResultado(fonte),

    jobs
  }
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

  const jobs = (dados.jobs ?? [])
    .filter(vaga => vaga.isListed !== false)
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
          vaga.workplaceType === "Remote" ||
          localizacaoPareceRemota(localizacao),

        url: urlVaga,

        publishedAt: normalizarData(vaga.publishedAt)
      } satisfies NewJob
    })
    .filter((vaga): vaga is NewJob => vaga !== null)

  return {
    source: nomeResultado(fonte),

    jobs
  }
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

  const jobs = (dados.offers ?? [])
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
          oferta.workplace_type === "remote" ||
          localizacaoPareceRemota(localizacao),

        url: urlVaga,

        publishedAt: normalizarData(oferta.published_at ?? oferta.created_at ?? oferta.updated_at)
      } satisfies NewJob
    })
    .filter((vaga): vaga is NewJob => vaga !== null)

  return {
    source: nomeResultado(fonte),

    jobs
  }
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
  }
}
