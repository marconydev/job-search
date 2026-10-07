import { gerarTermosBuscaNativaSolides } from "../config/search-queries.js"

import { limparHtml } from "./collector-utils.js"

import { interpretarModalidadeEstruturada } from "../services/modalidade-vaga.js"

import type { JobCollection, JobCollector } from "../types/collector.js"

import type { NewJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

/**
 * Endpoint público usado pelo próprio front do portal Sólides.
 *
 * Descoberto decodificando o bundle JS do site. Não exige token.
 *
 * Devolve JSON com a vaga completa na própria listagem, portanto não
 * precisamos mais abrir a página individual de cada vaga.
 */
const URL_BUSCA_SOLIDES = "https://apigw.solides.com.br/jobs/v3/portal-vacancies"

const TEMPO_LIMITE_REQUISICAO_MS = 15000

const LIMITE_MAXIMO_POR_TERMO = 100

const LIMITE_MAXIMO_GLOBAL = 500

const LIMITE_MAXIMO_PAGINAS_POR_TERMO = 30

type SolidesJob = {
  id?: number | string

  title?: string

  description?: string

  companyName?: string

  redirectLink?: string

  homeOffice?: boolean

  jobType?: string

  currentState?: string

  createdAt?: string

  city?: {
    id?: number
    name?: string
    state_id?: number
  } | null

  state?: {
    id?: number
    name?: string
    code?: string
  } | null
}

type SolidesResponse = {
  success?: boolean

  errors?: unknown[]

  data?: {
    totalPages?: number
    currentPage?: number
    count?: number
    data?: SolidesJob[]
  }
}

function normalizarLimite(valor: number | undefined) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return 100
  }

  return Math.min(Math.max(Math.floor(valor), 1), LIMITE_MAXIMO_POR_TERMO)
}

function normalizarData(valor: string | undefined) {
  if (!valor) {
    return null
  }

  const data = new Date(valor)

  return Number.isNaN(data.getTime()) ? null : data.toISOString()
}

/**
 * A modalidade prefere o campo estruturado `jobType` quando informado.
 *
 * `homeOffice` é usado apenas como fallback quando `jobType` está ausente
 * ou traz um valor que não reconhecemos.
 */
function vagaSolidesEhRemota(job: SolidesJob) {
  const modalidade = interpretarModalidadeEstruturada(job.jobType)

  if (modalidade === "remote") {
    return true
  }

  if (modalidade === "hybrid" || modalidade === "on-site") {
    return false
  }

  return job.homeOffice === true
}

function localizacaoSolides(job: SolidesJob): string | null {
  const cidade = job.city?.name?.trim()

  const uf = job.state?.code?.trim()

  if (cidade && uf) {
    return `${cidade}, ${uf}, Brasil`
  }

  if (cidade) {
    return cidade
  }

  if (uf) {
    return uf
  }

  return null
}

function normalizarVaga(job: SolidesJob): NewJob | null {
  const idBruto = job.id

  const id = idBruto === undefined || idBruto === null ? "" : String(idBruto).trim()

  const titulo = job.title?.trim()

  const url = job.redirectLink?.trim()

  if (!id || !titulo || !url) {
    return null
  }

  const descricaoLimpa = limparHtml(job.description ?? "")

  const descricao = descricaoLimpa || titulo

  const empresa = job.companyName?.trim() || "Empresa não identificada"

  const localizacao = localizacaoSolides(job)

  const remoto = vagaSolidesEhRemota(job)

  const workplaceType = (() => {
    const modalidade = interpretarModalidadeEstruturada(job.jobType)
    if (modalidade !== "unknown") return modalidade
    if (job.homeOffice === true) return "remote" as const
    return "unknown" as const
  })()

  return {
    source: "solides",

    externalId: id,

    company: empresa,

    title: titulo,

    description: descricao,

    location: localizacao,

    remote: remoto,

    workplaceType,

    url,

    publishedAt: normalizarData(job.createdAt),

    partial: !descricaoLimpa
  }
}

async function buscarPagina(
  termo: string,
  pagina: number
): Promise<{ jobs: SolidesJob[]; totalPages: number | null }> {
  const url = new URL(URL_BUSCA_SOLIDES)

  url.searchParams.set("title", termo)

  url.searchParams.set("page", String(pagina))

  const controlador = new AbortController()

  const temporizador = setTimeout(() => controlador.abort(), TEMPO_LIMITE_REQUISICAO_MS)

  try {
    const resposta = await fetch(url, {
      signal: controlador.signal,

      headers: {
        Accept: "application/json",

        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",

        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      }
    })

    if (!resposta.ok) {
      throw new Error(`Sólides respondeu com status ${resposta.status}`)
    }

    const dados = (await resposta.json()) as SolidesResponse

    const jobs = Array.isArray(dados.data?.data) ? dados.data.data : []

    const totalPages =
      typeof dados.data?.totalPages === "number" && Number.isFinite(dados.data.totalPages)
        ? Math.max(1, Math.floor(dados.data.totalPages))
        : null

    return { jobs, totalPages }
  } finally {
    clearTimeout(temporizador)
  }
}

/**
 * A coleta usa o mesmo contrato público do portal:
 *
 * - cada cargo do perfil vira um termo pesquisado individualmente;
 * - a paginação para quando `totalPages` é atingido ou a página vem vazia;
 * - vagas são deduplicadas pelo id da própria Sólides;
 * - uma falha em um termo não interrompe os demais.
 */
export async function collectSolidesJobs(
  limit = 100,
  perfil?: PerfilProfissional
): Promise<JobCollection> {
  if (!perfil) {
    return {
      source: "solides",

      jobs: []
    }
  }

  const termos = gerarTermosBuscaNativaSolides(perfil)

  if (termos.length === 0) {
    return {
      source: "solides",

      jobs: []
    }
  }

  const limitePorTermo = normalizarLimite(limit)

  const limiteGlobal = Math.min(Math.max(limitePorTermo * 5, 200), LIMITE_MAXIMO_GLOBAL)

  const vagasPorId = new Map<string, NewJob>()

  for (const termo of termos) {
    if (vagasPorId.size >= limiteGlobal) {
      break
    }

    const idsVistosNesteTermo = new Set<string>()

    let totalPages: number | null = null

    for (let pagina = 1; pagina <= LIMITE_MAXIMO_PAGINAS_POR_TERMO; pagina++) {
      if (vagasPorId.size >= limiteGlobal) {
        break
      }

      if (idsVistosNesteTermo.size >= limitePorTermo) {
        break
      }

      let resultado: { jobs: SolidesJob[]; totalPages: number | null }

      try {
        resultado = await buscarPagina(termo, pagina)
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : "erro desconhecido"

        console.warn(`Sólides: falha em "${termo}" página ${pagina}: ${mensagem}`)

        break
      }

      if (resultado.totalPages !== null) {
        totalPages = resultado.totalPages
      }

      if (resultado.jobs.length === 0) {
        break
      }

      let novosNestaPagina = 0

      for (const bruto of resultado.jobs) {
        const idBruto = bruto.id

        const id = idBruto === undefined || idBruto === null ? "" : String(idBruto).trim()

        if (!id || idsVistosNesteTermo.has(id)) {
          continue
        }

        idsVistosNesteTermo.add(id)

        novosNestaPagina++

        const vaga = normalizarVaga(bruto)

        if (!vaga) {
          continue
        }

        if (!vagasPorId.has(vaga.externalId)) {
          vagasPorId.set(vaga.externalId, vaga)
        }

        if (vagasPorId.size >= limiteGlobal) {
          break
        }
      }

      if (novosNestaPagina === 0) {
        break
      }

      if (totalPages !== null && pagina >= totalPages) {
        break
      }
    }

    console.log(
      `Sólides: "${termo}" consultado. ${idsVistosNesteTermo.size} resultado(s) para o termo.`
    )
  }

  const jobs = [...vagasPorId.values()]

  console.log(
    `Sólides: ${termos.length} termo(s) pesquisado(s), ${jobs.length} vaga(s) única(s) coletada(s).`
  )

  return {
    source: "solides",

    jobs
  }
}

export const solidesCollector: JobCollector = {
  name: "solides",

  collect: collectSolidesJobs
}
