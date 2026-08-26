import * as cheerio from "cheerio"

import {
  criarSlugBusca,
  fetchComTimeout,
  gerarTermosPerfil,
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
 * Parser isolado para permitir testes sem acesso à internet.
 *
 * Seletores possuem alternativas porque o Vagas.com mantém mais de um
 * formato de card em páginas diferentes.
 */
export function parseVagasComHtml(html: string, agora = new Date()) {
  const $ = cheerio.load(html)

  const vagas = new Map<string, NewJob>()

  $("a[href*='/vagas/v']").each((_indice, elemento) => {
    const link = $(elemento)

    const url = resolverUrl(BASE_URL, link.attr("href"))

    if (!url) {
      return
    }

    const externalId = extrairIdVaga(url)

    if (!externalId || vagas.has(externalId)) {
      return
    }

    const containerConhecido = link.closest("li, article, .vaga, .grupoVaga, li[id^='id_vaga']")

    const container =
      containerConhecido.length > 0 ? containerConhecido : link.parent().parent().parent()

    const titulo =
      limparEspacos(link.text()) || limparEspacos(container.find("h1, h2, h3").first().text())

    if (!titulo) {
      return
    }

    const empresa =
      limparEspacos(container.find(".emprVaga, [class*='empresa']").first().text()) ||
      (() => {
        const alt = container.find("img[alt]").first().attr("alt")

        if (alt && normalizarTexto(alt).includes("logo da empresa")) {
          return limparEspacos(alt.replace(/logo da empresa/gi, ""))
        }

        return ""
      })() ||
      "Empresa não identificada"

    const textoCard = limparEspacos(container.text())

    const textoMetadados =
      limparEspacos(
        container.find(".local, .vaga-local, .infoVaga, time, [class*='data']").text()
      ) || textoCard.slice(-500)

    /**
     * Não inferimos remoto a partir da descrição.
     *
     * "100% Home Office" é o rótulo explícito utilizado pelo próprio
     * Vagas.com para modalidade remota.
     */
    const remoto =
      normalizarTexto(textoMetadados).includes("100% home office") ||
      normalizarTexto(textoMetadados).includes("100 home office")

    const localizacao = remoto ? "Brasil" : extrairLocalizacaoBrasil(textoMetadados)

    const descricao =
      limparEspacos(container.find(".detalhes, .descricaoVaga").first().text()) ||
      textoCard ||
      titulo

    vagas.set(externalId, {
      source: "vagas",

      externalId,

      company: empresa,

      title: titulo,

      description: descricao,

      location: localizacao,

      remote: remoto,

      url,

      publishedAt: interpretarDataPtBr(textoMetadados, agora),

      /**
       * O card da busca não contém necessariamente a publicação inteira.
       * Marcamos como parcial em vez de fingir possuir todos os dados.
       */
      partial: true
    })
  })

  return [...vagas.values()]
}

async function pesquisarVagasCom(termo: string) {
  const slug = criarSlugBusca(termo)

  if (!slug) {
    return []
  }

  const url = `${BASE_URL}/vagas-de-${slug}` + "?ordenar_por=mais_recentes"

  const resposta = await fetchComTimeout(url, {
    headers: {
      Accept: "text/html"
    }
  })

  if (!resposta.ok) {
    throw new Error(`Vagas.com respondeu com status ${resposta.status}`)
  }

  const html = await resposta.text()

  return parseVagasComHtml(html)
}

export async function collectVagasComJobs(
  limit = 100,
  perfil?: PerfilProfissional
): Promise<JobCollection> {
  if (!perfil) {
    return {
      source: "vagas",

      jobs: []
    }
  }

  const termos = gerarTermosPerfil(perfil, LIMITE_TERMOS)

  const limite =
    typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 100

  const vagasPorId = new Map<string, NewJob>()

  for (const termo of termos) {
    try {
      const vagas = await pesquisarVagasCom(termo)

      for (const vaga of vagas) {
        if (!vagasPorId.has(vaga.externalId)) {
          vagasPorId.set(vaga.externalId, vaga)
        }

        if (vagasPorId.size >= limite) {
          break
        }
      }

      console.log(
        `Vagas.com: "${termo}" consultado, ` + `${vagas.length} resultado(s) extraído(s).`
      )
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "erro desconhecido"

      console.warn(`Vagas.com: falha ao pesquisar "${termo}": ${mensagem}`)
    }

    if (vagasPorId.size >= limite) {
      break
    }
  }

  console.log(`Vagas.com: ${vagasPorId.size} vaga(s) única(s) coletada(s).`)

  return {
    source: "vagas",

    jobs: [...vagasPorId.values()]
  }
}

export const vagasComCollector: JobCollector = {
  name: "vagas",

  collect: collectVagasComJobs
}
