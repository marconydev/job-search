import * as cheerio from "cheerio"

import {
  fetchComTimeout,
  interpretarDataPtBr,
  limparEspacos,
  normalizarTexto,
  resolverUrl
} from "./collector-utils.js"

import { gerarTermosBuscaPortugues } from "./collector-utils.js"

import type { JobCollection, JobCollector } from "../types/collector.js"

import type { NewJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

const BASE_URL = "https://www.geekhunter.com"

const URL_VAGAS = `${BASE_URL}/pt/vagas`

const LIMITE_MAXIMO_PAGINAS = 10

const LIMITE_PADRAO = 100

function capitalizarSlug(valor: string) {
  return valor
    .replace(/-\d+$/, "")
    .split("-")
    .filter(Boolean)
    .map(parte => {
      return parte.charAt(0).toUpperCase() + parte.slice(1)
    })
    .join(" ")
}

function extrairIdentidadeGeekHunter(url: string) {
  try {
    const parsed = new URL(url)

    const partes = parsed.pathname.split("/").filter(Boolean)

    const indiceJobs = partes.indexOf("jobs")

    if (indiceJobs < 2 || !partes[indiceJobs + 1]) {
      return null
    }

    const empresaSlug = partes[indiceJobs - 1]

    const vagaSlug = partes[indiceJobs + 1]

    return {
      externalId: `${empresaSlug}/${vagaSlug}`,

      empresa: capitalizarSlug(empresaSlug),

      vagaSlug
    }
  } catch {
    return null
  }
}

function tituloPorSlug(slug: string) {
  return capitalizarSlug(slug)
}

function encontrarContainerDaVaga($: cheerio.CheerioAPI, link: cheerio.Cheerio<any>) {
  let atual = link.parent()

  for (let profundidade = 0; profundidade < 7 && atual.length > 0; profundidade++) {
    const texto = normalizarTexto(atual.text())

    const linksJobs = new Set<string>()

    atual.find("a[href*='/jobs/']").each((_indice, elemento) => {
      const href = $(elemento).attr("href")

      if (href) {
        linksJobs.add(href)
      }
    })

    const pareceUmaVaga =
      texto.includes("tarefas e responsabilidades") || texto.includes("requisitos")

    if (pareceUmaVaga && linksJobs.size <= 1) {
      return atual
    }

    if (linksJobs.size > 1) {
      break
    }

    atual = atual.parent()
  }

  const semantico = link.closest("article, li, [class*='job'], [class*='vaga']")

  return semantico.length > 0 ? semantico : link.parent()
}

function extrairModalidade(cabecalho: string) {
  const regex = /\b(Remoto|Híbrido|Hibrido|Presencial)\b/gi

  let ultimo: {
    valor: string

    fim: number
  } | null = null

  for (const resultado of cabecalho.matchAll(regex)) {
    if (resultado.index === undefined) {
      continue
    }

    ultimo = {
      valor: normalizarTexto(resultado[0]),

      fim: resultado.index + resultado[0].length
    }
  }

  return ultimo
}

function extrairLocalizacao(texto: string) {
  const completa = texto.match(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.' -]{1,60}),\s*([A-Z]{2}),\s*Brasil\b/i)

  if (completa) {
    return `${limparEspacos(completa[1])}, ${completa[2].toUpperCase()}, Brasil`
  }

  const curta = texto.match(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.' -]{1,60})\s*[,/]\s*([A-Z]{2})\b/)

  if (!curta) {
    return null
  }

  return `${limparEspacos(curta[1])}, ${curta[2].toUpperCase()}, Brasil`
}

function extrairPublicacao(cabecalho: string, agora: Date) {
  const inicio = cabecalho.search(/\bPublicada\b/i)

  if (inicio < 0) {
    return null
  }

  const restante = cabecalho.slice(inicio)

  const fim = restante.search(/\b(Atualizada|Remoto|Híbrido|Hibrido|Presencial)\b/i)

  const trecho = fim > 0 ? restante.slice(0, fim) : restante

  return interpretarDataPtBr(trecho, agora)
}

function extrairDescricao(texto: string, titulo: string) {
  const normalizado = normalizarTexto(texto)

  const marcadorTarefas = normalizado.indexOf("tarefas e responsabilidades")

  if (marcadorTarefas < 0) {
    return {
      descricao: titulo,

      partial: true
    }
  }

  /**
   * Busco os marcadores novamente no texto original por regex para não
   * depender dos índices do texto normalizado, que pode mudar com acentos.
   */
  const inicioOriginal = texto.search(/tarefas e responsabilidades/i)

  if (inicioOriginal < 0) {
    return {
      descricao: titulo,

      partial: true
    }
  }

  const depoisDoInicio = texto.slice(inicioOriginal)

  const indiceRequisitos = depoisDoInicio.search(/\brequisitos\b/i)

  const descricao = limparEspacos(
    indiceRequisitos > 0 ? depoisDoInicio.slice(0, indiceRequisitos) : depoisDoInicio
  )

  return {
    descricao: descricao || titulo,

    partial: true
  }
}

/**
 * Parser semântico e isolado.
 *
 * Evito depender das classes CSS visuais da GeekHunter. A identificação
 * principal é feita pelos próprios links /jobs/ e pelos textos estruturais
 * apresentados em cada vaga.
 */
export function parseGeekHunterHtml(html: string, agora = new Date()) {
  const $ = cheerio.load(html)

  const vagas = new Map<string, NewJob>()

  $("a[href*='/jobs/']").each((_indice, elemento) => {
    const link = $(elemento)

    const url = resolverUrl(BASE_URL, link.attr("href"))

    if (!url) {
      return
    }

    const identidade = extrairIdentidadeGeekHunter(url)

    if (!identidade || vagas.has(identidade.externalId)) {
      return
    }

    const container = encontrarContainerDaVaga($, link)

    const textoContainer = limparEspacos(container.text())

    if (!textoContainer) {
      return
    }

    const tituloLink = limparEspacos(link.text())

    const tituloCabecalho = limparEspacos(container.find("h1, h2, h3, h4").first().text())

    const tituloGenerico = /^(ver vaga|ver oportunidade|candidatar|candidatar-se)$/i

    const titulo =
      tituloLink && !tituloGenerico.test(tituloLink)
        ? tituloLink
        : tituloCabecalho || tituloPorSlug(identidade.vagaSlug)

    if (!titulo) {
      return
    }

    const indiceTarefas = textoContainer.search(/tarefas e responsabilidades/i)

    const cabecalho =
      indiceTarefas > 0 ? textoContainer.slice(0, indiceTarefas) : textoContainer.slice(0, 800)

    const modalidade = extrairModalidade(cabecalho)

    const remoto = modalidade?.valor === "remoto"

    const textoAposModalidade = modalidade ? cabecalho.slice(modalidade.fim) : cabecalho

    const localizacao = remoto ? "Brasil" : extrairLocalizacao(textoAposModalidade)

    const descricao = extrairDescricao(textoContainer, titulo)

    vagas.set(identidade.externalId, {
      source: "geekhunter",

      externalId: identidade.externalId,

      company: identidade.empresa || "Empresa não identificada",

      title: titulo,

      description: descricao.descricao,

      location: localizacao,

      remote: remoto,

      workplaceType: remoto
        ? "remote"
        : modalidade?.valor === "hibrido"
          ? "hybrid"
          : modalidade?.valor === "presencial"
            ? "on-site"
            : "unknown",

      url,

      /**
       * Se a página só disser "Atualizada há X", não transformamos essa
       * informação em data de publicação.
       */
      publishedAt: extrairPublicacao(cabecalho, agora),

      partial: descricao.partial
    })
  })

  return [...vagas.values()]
}

function normalizarLimite(valor: number | undefined) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return LIMITE_PADRAO
  }

  return Math.min(Math.max(Math.floor(valor), 1), LIMITE_PADRAO)
}

async function buscarPagina(pagina: number, termo?: string) {
  const url = new URL(URL_VAGAS)

  if (termo) {
    url.searchParams.set("title", termo)
  }

  if (pagina > 1) {
    url.searchParams.set("page", String(pagina))
  }

  const resposta = await fetchComTimeout(url, {
    headers: {
      Accept: "text/html"
    }
  })

  if (!resposta.ok) {
    throw new Error(`GeekHunter respondeu com status ${resposta.status}`)
  }

  return resposta.text()
}

export async function collectGeekHunterJobs(
  limit = LIMITE_PADRAO,
  perfil?: PerfilProfissional
): Promise<JobCollection> {
  const limite = normalizarLimite(limit)

  const vagasPorId = new Map<string, NewJob>()

  const termos = perfil ? gerarTermosBuscaPortugues(perfil, 10) : []

  const escopos = termos.length > 0 ? termos : [undefined]

  for (const termo of escopos) {
    for (let pagina = 1; pagina <= LIMITE_MAXIMO_PAGINAS && vagasPorId.size < limite; pagina++) {
    let html: string

    try {
      html = await buscarPagina(pagina, termo)
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "erro desconhecido"

      console.warn(`GeekHunter: falha na página ${pagina}: ${mensagem}`)

      break
    }

    const vagas = parseGeekHunterHtml(html)

    if (vagas.length === 0) {
      break
    }

    let novasNestaPagina = 0

    for (const vaga of vagas) {
      if (vagasPorId.has(vaga.externalId)) {
        continue
      }

      vagasPorId.set(vaga.externalId, vaga)

      novasNestaPagina++

      if (vagasPorId.size >= limite) {
        break
      }
    }

    console.log(
      `GeekHunter: termo="${termo ?? "sem filtro"}" página ${pagina}, ` +
        `${vagas.length} vaga(s) extraída(s), ` +
        `${novasNestaPagina} nova(s) nesta coleta.`
    )

    /**
     * Proteção contra paginação repetida pelo servidor.
     */
    if (novasNestaPagina === 0) {
      break
    }
    }

    if (vagasPorId.size >= limite) {
      break
    }
  }

  console.log(`GeekHunter: ${vagasPorId.size} vaga(s) única(s) coletada(s).`)

  return {
    source: "geekhunter",

    jobs: [...vagasPorId.values()]
  }
}

export const geekHunterCollector: JobCollector = {
  name: "geekhunter",

  collect: collectGeekHunterJobs
}
