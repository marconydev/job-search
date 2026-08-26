import {
  fetchComTimeout,
  gerarTermosBuscaPortugues,
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

const LIMITE_MAXIMO_POR_TERMO = 50

const LIMITE_MAXIMO_GLOBAL = 300

const LIMITE_MAXIMO_POR_PAGINA = 25

const LIMITE_MAXIMO_PAGINAS_POR_TERMO = 2

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

type PaginaGetOnBoard = {
  jobs: GetOnBoardJob[]

  totalPages: number | null
}

function normalizarLimitePorTermo(valor: number | undefined) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return LIMITE_MAXIMO_POR_TERMO
  }

  return Math.min(Math.max(Math.floor(valor), 1), LIMITE_MAXIMO_POR_TERMO)
}

function normalizarLimitePagina(valor: number) {
  return Math.min(Math.max(Math.floor(valor), 1), LIMITE_MAXIMO_POR_PAGINA)
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
 * Uso remote_modality como fonte principal porque ela diferencia remoto, híbrido e presencial.
 *
 * Não trato híbrido como remoto: pela regra do projeto, uma vaga híbrida só pode seguir
 * quando a localização for compatível com João Pessoa/PB.
 */
function trabalhoEhRemoto(atributos: GetOnBoardJobAttributes) {
  const modalidade = normalizarTexto(atributos.remote_modality ?? "").replace(/\s+/g, "_")

  if (
    modalidade === "fully_remote" ||
    modalidade === "remote" ||
    modalidade === "remote_local" ||
    modalidade === "remote_global"
  ) {
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

/**
 * Monto a consulta separadamente para conseguir testar o contrato da API sem fazer rede.
 *
 * Uso country=br, expand[]=company e uma página pequena. A combinação anterior
 * estava retornando 422 em produção, então mantenho os parâmetros compatíveis
 * com o formato usado pelo endpoint público.
 */
export function montarUrlBuscaGetOnBoard(termo: string, pagina: number, limitePagina: number) {
  const url = new URL(`${BASE_API}/search/jobs`)

  url.searchParams.set("query", termo)

  url.searchParams.set("country", "br")

  url.searchParams.set("lang", "pt")

  url.searchParams.append("expand[]", "company")

  url.searchParams.set("page", String(Math.max(1, Math.floor(pagina))))

  url.searchParams.set("per_page", String(normalizarLimitePagina(limitePagina)))

  return url
}

async function pesquisarPagina(
  termo: string,
  pagina: number,
  limitePagina: number
): Promise<PaginaGetOnBoard> {
  const url = montarUrlBuscaGetOnBoard(termo, pagina, limitePagina)

  const resposta = await fetchComTimeout(url, {
    headers: {
      Accept: "application/json"
    }
  })

  if (!resposta.ok) {
    const detalhe = limparEspacos((await resposta.text()).slice(0, 300))

    const complemento = detalhe ? `: ${detalhe}` : ""

    throw new Error(`GetOnBoard respondeu com status ${resposta.status}${complemento}`)
  }

  const dados = (await resposta.json()) as GetOnBoardResponse

  return {
    jobs: Array.isArray(dados.data) ? dados.data : [],

    totalPages:
      typeof dados.meta?.total_pages === "number" && Number.isFinite(dados.meta.total_pages)
        ? Math.max(1, Math.floor(dados.meta.total_pages))
        : null
  }
}

export async function collectGetOnBoardJobs(
  limit = LIMITE_MAXIMO_POR_TERMO,
  perfil?: PerfilProfissional
): Promise<JobCollection> {
  if (!perfil) {
    return {
      source: "getonboard",

      jobs: []
    }
  }

  const termos = gerarTermosBuscaPortugues(perfil, LIMITE_TERMOS)

  if (termos.length === 0) {
    return {
      source: "getonboard",

      jobs: []
    }
  }

  const limitePorTermo = normalizarLimitePorTermo(limit)

  const limiteGlobal = Math.min(Math.max(limitePorTermo * 6, 150), LIMITE_MAXIMO_GLOBAL)

  const vagasPorId = new Map<string, NewJob>()

  for (const termo of termos) {
    if (vagasPorId.size >= limiteGlobal) {
      break
    }

    let pagina = 1

    let recebidasNoTermo = 0

    while (recebidasNoTermo < limitePorTermo && pagina <= LIMITE_MAXIMO_PAGINAS_POR_TERMO) {
      const restanteDoTermo = limitePorTermo - recebidasNoTermo

      const tamanhoPagina = normalizarLimitePagina(restanteDoTermo)

      try {
        const resultado = await pesquisarPagina(termo, pagina, tamanhoPagina)

        if (resultado.jobs.length === 0) {
          break
        }

        recebidasNoTermo += resultado.jobs.length

        for (const resultadoBruto of resultado.jobs) {
          const vaga = normalizarVagaGetOnBoard(resultadoBruto)

          if (vagasPorId.size >= limiteGlobal) {
            break
          }

          if (!vaga || vagasPorId.has(vaga.externalId)) {
            continue
          }

          vagasPorId.set(vaga.externalId, vaga)
        }

        if (resultado.totalPages !== null && pagina >= resultado.totalPages) {
          break
        }

        if (resultado.jobs.length < tamanhoPagina) {
          break
        }

        pagina++
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : "erro desconhecido"

        console.warn(`GetOnBoard: falha ao pesquisar "${termo}" na página ${pagina}: ${mensagem}`)

        break
      }
    }

    console.log(`GetOnBoard: "${termo}" consultado, ${recebidasNoTermo} resultado(s) recebido(s).`)
  }

  const jobs = [...vagasPorId.values()]

  console.log(
    `GetOnBoard: ${termos.length} termo(s) em português pesquisado(s), ` +
      `${jobs.length} vaga(s) única(s) coletada(s).`
  )

  return {
    source: "getonboard",

    jobs
  }
}

export const getOnBoardCollector: JobCollector = {
  name: "getonboard",

  collect: collectGetOnBoardJobs
}
