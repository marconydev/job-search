import * as cheerio from "cheerio"

import { gerarTermosBuscaNativaGupy } from "../config/search-queries.js"

import type { JobCollection, JobCollector } from "../types/collector.js"

import type { NewJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

/**
 * Este endpoint é utilizado pelo portal público de vagas da Gupy.
 *
 * Não é a API corporativa autenticada disponível em api.gupy.io.
 */
const URL_GUPY = "https://employability-portal.gupy.io/api/v1/jobs"

const LIMITE_MAXIMO_PAGINA = 100

const LIMITE_MAXIMO_POR_TERMO = 300

const TEMPO_LIMITE_REQUISICAO_MS = 15000

type GupyJob = {
  id?: number | string

  name?: string

  careerPageName?: string

  companyName?: string

  description?: string

  city?: string

  state?: string

  country?: string

  workplaceType?: string

  isRemoteWork?: boolean

  jobUrl?: string

  careerPageUrl?: string

  publishedDate?: string
}

type GupyResponse = {
  data?: GupyJob[]
}

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : ""
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function limparHtml(valor: string | undefined) {
  const html = texto(valor)

  if (!html) {
    return ""
  }

  const $ = cheerio.load(html)

  $("br").replaceWith("\n")

  $("p, li, h1, h2, h3, h4").each((_indice, elemento) => {
    $(elemento).append("\n")
  })

  return $("body")
    .text()
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function normalizarData(valor: string | undefined) {
  const dataTexto = texto(valor)

  if (!dataTexto) {
    return null
  }

  const data = new Date(dataTexto)

  return Number.isNaN(data.getTime()) ? null : data.toISOString()
}

function montarLocalizacao(vaga: GupyJob) {
  const partes = [texto(vaga.city), texto(vaga.state), texto(vaga.country)].filter(Boolean)

  if (partes.length === 0) {
    return null
  }

  const unicas = new Map<string, string>()

  for (const parte of partes) {
    const chave = normalizarTexto(parte)

    if (!unicas.has(chave)) {
      unicas.set(chave, parte)
    }
  }

  return [...unicas.values()].join(", ")
}

function detectarRemoto(vaga: GupyJob, descricao: string) {
  const modalidade = normalizarTexto(texto(vaga.workplaceType))

  if (modalidade === "remote" || modalidade === "remoto") {
    return true
  }

  if (vaga.isRemoteWork === true) {
    return true
  }

  const contexto = `${texto(vaga.name)} ${descricao}`

  return /\b(remote|remoto|remota|100%\s*remot[oa]|home\s*office)\b/i.test(contexto)
}

function normalizarVaga(vaga: GupyJob): NewJob | null {
  const id = vaga.id

  const titulo = texto(vaga.name)

  const url = texto(vaga.jobUrl) || texto(vaga.careerPageUrl)

  if (id === undefined || id === null || !titulo || !url) {
    return null
  }

  const descricaoCompleta = limparHtml(vaga.description)

  const descricao = descricaoCompleta || titulo

  const empresa = texto(vaga.careerPageName) || texto(vaga.companyName) || "Empresa não identificada"

  return {
    source: "gupy",

    externalId: String(id),

    company: empresa,

    title: titulo,

    description: descricao,

    location: montarLocalizacao(vaga),

    remote: detectarRemoto(vaga, descricao),

    url,

    publishedAt: normalizarData(vaga.publishedDate),

    /**
     * Se por algum motivo a listagem vier sem descrição, preservo a vaga
     * para análise posterior em vez de descartá-la silenciosamente.
     */
    partial: !descricaoCompleta
  }
}

function normalizarLimite(valor: number | undefined) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return 100
  }

  return Math.min(Math.max(Math.floor(valor), 1), LIMITE_MAXIMO_POR_TERMO)
}

async function buscarPaginaGupy(termo: string, limit: number, offset: number) {
  const url = new URL(URL_GUPY)

  url.searchParams.set("jobName", termo)

  url.searchParams.set("limit", String(limit))

  url.searchParams.set("offset", String(offset))

  url.searchParams.set("sortBy", "publishedDate")

  const controlador = new AbortController()

  const temporizador = setTimeout(() => controlador.abort(), TEMPO_LIMITE_REQUISICAO_MS)

  try {
    const resposta = await fetch(url, {
      signal: controlador.signal,

      headers: {
        Accept: "application/json",

        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",

        "User-Agent": "Mozilla/5.0 job-search/1.0"
      }
    })

    if (!resposta.ok) {
      throw new Error(`Gupy respondeu com status ${resposta.status}`)
    }

    const dados = (await resposta.json()) as GupyResponse

    return Array.isArray(dados.data) ? dados.data : []
  } finally {
    clearTimeout(temporizador)
  }
}

/**
 * A Gupy funciona como o usuário utilizando a busca manual do portal:
 *
 * - cada cargo é pesquisado individualmente;
 * - cada termo pode retornar até 100 vagas por requisição;
 * - os resultados são deduplicados pelo ID da própria Gupy;
 * - uma falha em um termo não interrompe os demais.
 *
 * Isso aumenta a cobertura sem gastar chamadas da Brave.
 */
export async function collectGupyJobs(
  limit = 100,
  perfil?: PerfilProfissional
): Promise<JobCollection> {
  if (!perfil) {
    return {
      source: "gupy",

      jobs: []
    }
  }

  const termos = gerarTermosBuscaNativaGupy(perfil)

  if (termos.length === 0) {
    return {
      source: "gupy",

      jobs: []
    }
  }

  const limitePorTermo = normalizarLimite(limit)

  const vagasPorId = new Map<string, NewJob>()

  for (const termo of termos) {
    let offset = 0

    let quantidadeConsultada = 0

    const idsVistosNesteTermo = new Set<string>()

    while (quantidadeConsultada < limitePorTermo) {
      const restante = limitePorTermo - quantidadeConsultada

      const tamanhoPagina = Math.min(LIMITE_MAXIMO_PAGINA, restante)

      let pagina: GupyJob[]

      try {
        pagina = await buscarPaginaGupy(termo, tamanhoPagina, offset)
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : "erro desconhecido"

        console.warn(`Gupy: falha ao pesquisar "${termo}": ${mensagem}`)

        break
      }

      if (pagina.length === 0) {
        break
      }

      let idsNovosNesteTermo = 0

      for (const vagaBruta of pagina) {
        if (vagaBruta.id === undefined || vagaBruta.id === null) {
          continue
        }

        const id = String(vagaBruta.id)

        if (idsVistosNesteTermo.has(id)) {
          continue
        }

        idsVistosNesteTermo.add(id)

        idsNovosNesteTermo++

        const vaga = normalizarVaga(vagaBruta)

        if (!vaga) {
          continue
        }

        if (!vagasPorId.has(vaga.externalId)) {
          vagasPorId.set(vaga.externalId, vaga)
        }
      }

      quantidadeConsultada += pagina.length

      offset += pagina.length

      if (pagina.length < tamanhoPagina) {
        break
      }

      /**
       * Proteção contra eventual repetição da mesma página pela API.
       */
      if (idsNovosNesteTermo === 0) {
        break
      }
    }

    console.log(
      `Gupy: "${termo}" consultado. ` +
        `${idsVistosNesteTermo.size} resultado(s) recebido(s) para o termo.`
    )
  }

  console.log(
    `Gupy: ${termos.length} termo(s) pesquisado(s), ` +
      `${vagasPorId.size} vaga(s) única(s) coletada(s).`
  )

  return {
    source: "gupy",

    jobs: [...vagasPorId.values()]
  }
}

export const gupyCollector: JobCollector = {
  name: "gupy",

  collect: collectGupyJobs
}