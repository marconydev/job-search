import * as cheerio from "cheerio"

import {
  criarSlugBusca,
  fetchComTimeout,
  gerarTermosBuscaPortugues,
  interpretarDataPtBr,
  limparEspacos,
  normalizarTexto,
  resolverUrl
} from "./collector-utils.js"

import type { JobCollection, JobCollector } from "../types/collector.js"

import type { NewJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

const BASE_URL = "https://www.vagas.com.br"

const LIMITE_TERMOS = 10

const LIMITE_MAXIMO_POR_TERMO = 100

const LIMITE_MAXIMO_GLOBAL = 500

const LIMITE_MAXIMO_PAGINAS_POR_TERMO = 5

function normalizarLimitePorTermo(valor: number | undefined) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return LIMITE_MAXIMO_POR_TERMO
  }

  return Math.min(Math.max(Math.floor(valor), 1), LIMITE_MAXIMO_POR_TERMO)
}

function extrairIdVaga(url: string) {
  const resultado = url.match(/\/vagas\/v(\d+)(?:\/|$)/i)

  return resultado?.[1] ?? null
}

function extrairLocalizacaoBrasil(texto: string) {
  const candidatos = [...texto.matchAll(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.' -]{1,60})\s*\/\s*([A-Z]{2})\b/g)]

  if (candidatos.length === 0) {
    return null
  }

  const ultimo = candidatos[candidatos.length - 1]

  const cidade = limparEspacos(ultimo[1].split(/[|•·]/).pop())

  const estado = ultimo[2]

  if (!cidade || !estado) {
    return null
  }

  return `${cidade}, ${estado}, Brasil`
}

/**
 * Leio os cards que o Vagas.com já entrega no HTML da busca.
 *
 * Priorizo os atributos e classes semânticas do próprio card para não usar o texto inteiro
 * do link como título. Isso evita valores poluídos como "Vaga ... | Vagas.com" e também
 * preserva empresa, localização e data em campos separados.
 */
export function parseVagasComHtml(html: string, agora = new Date()) {
  const $ = cheerio.load(html)

  const vagas = new Map<string, NewJob>()

  $("li.vaga, li[id^='id_vaga']").each((_indice, elemento) => {
    const card = $(elemento)

    const link = card.find("a.link-detalhes-vaga, h2.cargo a").first()

    if (link.length === 0) {
      return
    }

    const url = resolverUrl(BASE_URL, link.attr("href"))

    if (!url) {
      return
    }

    const externalId = limparEspacos(link.attr("data-id-vaga")) || extrairIdVaga(url)

    if (!externalId || vagas.has(externalId)) {
      return
    }

    const titulo = limparEspacos(link.attr("title")) || limparEspacos(link.text())

    if (!titulo) {
      return
    }

    const empresa =
      limparEspacos(card.find("span.emprVaga, [class*='empresa']").first().text()) ||
      "Empresa não identificada"

    const textoLocalizacao = limparEspacos(card.find(".vaga-local, .local").first().text())

    const textoData = limparEspacos(card.find("span.data-publicacao, time").first().text())

    const descricaoCompleta = limparEspacos(
      card.find("div.detalhes, .descricaoVaga").first().text()
    )

    const localizacaoNormalizada = normalizarTexto(textoLocalizacao)

    /**
     * Só marco como remoto quando o próprio campo de localização informa Home Office.
     *
     * Não uso a descrição para adivinhar modalidade e mantenho híbrido/presencial como
     * não remoto quando o card não fornece essa distinção de forma confiável.
     */
    const remoto =
      localizacaoNormalizada.includes("100% home office") ||
      localizacaoNormalizada.includes("100 home office")

    const localizacao = remoto ? "Brasil" : extrairLocalizacaoBrasil(textoLocalizacao)

    vagas.set(externalId, {
      source: "vagas",

      externalId,

      company: empresa,

      title: titulo,

      description: descricaoCompleta || titulo,

      location: localizacao,

      remote: remoto,

      workplaceType: remoto ? "remote" : "unknown",

      url,

      publishedAt: interpretarDataPtBr(textoData, agora),

      partial: true
    })
  })

  return [...vagas.values()]
}

/**
 * Monto a URL separadamente para manter paginação e ordenação testáveis sem fazer rede.
 */
export function montarUrlBuscaVagasCom(termo: string, pagina: number) {
  const slug = criarSlugBusca(termo)

  if (!slug) {
    return null
  }

  const url = new URL(`${BASE_URL}/vagas-de-${slug}`)

  url.searchParams.set("ordenar_por", "mais_recentes")

  url.searchParams.set("pagina", String(Math.max(1, Math.floor(pagina))))

  return url
}

async function buscarPaginaVagasCom(termo: string, pagina: number) {
  const url = montarUrlBuscaVagasCom(termo, pagina)

  if (!url) {
    return []
  }

  const resposta = await fetchComTimeout(url, {
    headers: {
      Accept: "text/html"
    }
  })

  if (!resposta.ok) {
    throw new Error(`Vagas.com respondeu com status ${resposta.status}`)
  }

  return parseVagasComHtml(await resposta.text())
}

async function pesquisarVagasCom(termo: string, limitePorTermo: number) {
  const vagasPorId = new Map<string, NewJob>()

  for (
    let pagina = 1;
    pagina <= LIMITE_MAXIMO_PAGINAS_POR_TERMO && vagasPorId.size < limitePorTermo;
    pagina++
  ) {
    const vagas = await buscarPaginaVagasCom(termo, pagina)

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

      if (vagasPorId.size >= limitePorTermo) {
        break
      }
    }

    if (novasNestaPagina === 0) {
      break
    }
  }

  return [...vagasPorId.values()]
}

async function collectVagasComJobs(
  limit = LIMITE_MAXIMO_POR_TERMO,
  perfil?: PerfilProfissional
): Promise<JobCollection> {
  if (!perfil) {
    return {
      source: "vagas",

      jobs: []
    }
  }

  const termos = gerarTermosBuscaPortugues(perfil, LIMITE_TERMOS)

  if (termos.length === 0) {
    return {
      source: "vagas",

      jobs: []
    }
  }

  const limitePorTermo = normalizarLimitePorTermo(limit)

  const limiteGlobal = Math.min(Math.max(limitePorTermo * 5, 200), LIMITE_MAXIMO_GLOBAL)

  const vagasPorId = new Map<string, NewJob>()

  for (const termo of termos) {
    if (vagasPorId.size >= limiteGlobal) {
      break
    }

    try {
      const vagas = await pesquisarVagasCom(termo, limitePorTermo)

      for (const vaga of vagas) {
        if (vagasPorId.size >= limiteGlobal) {
          break
        }

        if (!vagasPorId.has(vaga.externalId)) {
          vagasPorId.set(vaga.externalId, vaga)
        }
      }

      console.log(
        `Vagas.com: "${termo}" consultado em português, ` +
          `${vagas.length} resultado(s) único(s) extraído(s).`
      )
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "erro desconhecido"

      console.warn(`Vagas.com: falha ao pesquisar "${termo}": ${mensagem}`)
    }
  }

  const jobs = [...vagasPorId.values()]

  console.log(
    `Vagas.com: ${termos.length} termo(s) em português disponível(is), ` +
      `${jobs.length} vaga(s) única(s) coletada(s).`
  )

  return {
    source: "vagas",

    jobs
  }
}

export const vagasComCollector: JobCollector = {
  name: "vagas",

  collect: collectVagasComJobs
}
