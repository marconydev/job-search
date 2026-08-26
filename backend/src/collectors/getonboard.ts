import {
  fetchComTimeout,
  gerarTermosPerfil,
  limparHtml,
  limparEspacos,
  normalizarTexto
} from "./collector-utils.js"

import type { JobCollection, JobCollector } from "../types/collector.js"

import type { NewJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

const BASE_API = "https://www.getonbrd.com/api/v0"

const BASE_VAGAS = "https://www.getonbrd.com/jobs/"

const LIMITE_TERMOS = 8

const LIMITE_MAXIMO_RESULTADOS = 120

type GetOnBoardCompany = {
  data?: {
    id?: number | string

    attributes?: {
      name?: string
    }
  } | null
}

type GetOnBoardJobAttributes = {
  title?: string

  description?: string

  projects?: string

  functions?: string

  benefits?: string

  desirable?: string

  remote?: boolean

  remote_modality?: string

  countries?: string[]

  published_at?: number | string | null

  company?: GetOnBoardCompany
}

type GetOnBoardJob = {
  id?: string | number

  attributes?: GetOnBoardJobAttributes
}

type GetOnBoardResponse = {
  data?: GetOnBoardJob[]

  meta?: {
    page?: number

    per_page?: number

    total_pages?: number
  }
}

function normalizarLimite(valor: number | undefined) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return 100
  }

  return Math.min(Math.max(Math.floor(valor), 1), LIMITE_MAXIMO_RESULTADOS)
}

function normalizarDataPublicacao(valor: number | string | null | undefined) {
  if (valor === null || valor === undefined) {
    return null
  }

  if (typeof valor === "number") {
    const milissegundos = valor < 1_000_000_000_000 ? valor * 1000 : valor

    const data = new Date(milissegundos)

    return Number.isNaN(data.getTime()) ? null : data.toISOString()
  }

  const limpo = valor.trim()

  if (!limpo) {
    return null
  }

  const numerico = Number(limpo)

  if (Number.isFinite(numerico)) {
    return normalizarDataPublicacao(numerico)
  }

  const data = new Date(limpo)

  return Number.isNaN(data.getTime()) ? null : data.toISOString()
}

/**
 * remote_modality é a fonte principal da verdade.
 *
 * Importante para nossa política:
 * híbrida NÃO é tratada como remota, porque vagas híbridas só podem
 * entrar quando localizadas em João Pessoa/PB.
 */
function trabalhoEhRemoto(atributos: GetOnBoardJobAttributes) {
  const modalidade = normalizarTexto(atributos.remote_modality ?? "").replace(/\s+/g, "_")

  if (modalidade === "fully_remote" || modalidade === "remote") {
    return true
  }

  if (
    modalidade === "hybrid" ||
    modalidade === "no_remote" ||
    modalidade === "on_site" ||
    modalidade === "onsite"
  ) {
    return false
  }

  return atributos.remote === true
}

function montarDescricao(atributos: GetOnBoardJobAttributes) {
  const partes = [
    atributos.functions,
    atributos.description,
    atributos.projects,
    atributos.desirable,
    atributos.benefits
  ]
    .map(parte => parte?.trim())
    .filter((parte): parte is string => Boolean(parte))

  return limparHtml(partes.join("\n\n"))
}

export function normalizarVagaGetOnBoard(vaga: GetOnBoardJob): NewJob | null {
  const id = vaga.id

  const atributos = vaga.attributes

  if (id === null || id === undefined || !atributos) {
    return null
  }

  const titulo = limparEspacos(atributos.title)

  if (!titulo) {
    return null
  }

  const descricaoCompleta = montarDescricao(atributos)

  const empresa =
    limparEspacos(atributos.company?.data?.attributes?.name) || "Empresa não identificada"

  const paises = (atributos.countries ?? []).map(pais => limparEspacos(pais)).filter(Boolean)

  const remoto = trabalhoEhRemoto(atributos)

  const localizacao = paises.length > 0 ? [...new Set(paises)].join(", ") : remoto ? "Brasil" : null

  return {
    source: "getonboard",

    externalId: String(id),

    company: empresa,

    title: titulo,

    description: descricaoCompleta || titulo,

    location: localizacao,

    remote: remoto,

    url: `${BASE_VAGAS}${encodeURIComponent(String(id))}`,

    publishedAt: normalizarDataPublicacao(atributos.published_at),

    partial: !descricaoCompleta
  }
}

async function pesquisarTermo(termo: string, limite: number) {
  const url = new URL(`${BASE_API}/search/jobs`)

  url.searchParams.set("query", termo)

  url.searchParams.set("country_code", "BRA")

  url.searchParams.set("lang", "pt")

  url.searchParams.set("expand", JSON.stringify(["company"]))

  url.searchParams.set("page", "1")

  url.searchParams.set("per_page", String(limite))

  const resposta = await fetchComTimeout(url, {
    headers: {
      Accept: "application/json"
    }
  })

  if (!resposta.ok) {
    throw new Error(`GetOnBoard respondeu com status ${resposta.status}`)
  }

  const dados = (await resposta.json()) as GetOnBoardResponse

  return Array.isArray(dados.data) ? dados.data : []
}

export async function collectGetOnBoardJobs(
  limit = 100,
  perfil?: PerfilProfissional
): Promise<JobCollection> {
  if (!perfil) {
    return {
      source: "getonboard",

      jobs: []
    }
  }

  const termos = gerarTermosPerfil(perfil, LIMITE_TERMOS)

  if (termos.length === 0) {
    return {
      source: "getonboard",

      jobs: []
    }
  }

  const limite = normalizarLimite(limit)

  const vagasPorId = new Map<string, NewJob>()

  for (const termo of termos) {
    try {
      const resultados = await pesquisarTermo(termo, limite)

      let validas = 0

      for (const resultado of resultados) {
        const vaga = normalizarVagaGetOnBoard(resultado)

        if (!vaga) {
          continue
        }

        validas++

        if (!vagasPorId.has(vaga.externalId)) {
          vagasPorId.set(vaga.externalId, vaga)
        }
      }

      console.log(`GetOnBoard: "${termo}" retornou ${validas} vaga(s) válida(s).`)
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "erro desconhecido"

      console.warn(`GetOnBoard: falha ao pesquisar "${termo}": ${mensagem}`)
    }
  }

  console.log(
    `GetOnBoard: ${termos.length} termo(s) pesquisado(s), ` +
      `${vagasPorId.size} vaga(s) única(s) coletada(s).`
  )

  return {
    source: "getonboard",

    jobs: [...vagasPorId.values()]
  }
}

export const getOnBoardCollector: JobCollector = {
  name: "getonboard",

  collect: collectGetOnBoardJobs
}
