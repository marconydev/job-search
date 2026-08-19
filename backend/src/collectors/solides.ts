import * as cheerio from "cheerio"

import { gerarTermosBuscaNativaSolides } from "../config/search-queries.js"

import { extrairVagaSolides } from "../extractors/solides.js"

import type { JobCollection, JobCollector } from "../types/collector.js"

import type { NewJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

const URL_BUSCA_SOLIDES = "https://vagas.solides.com.br/vagas"

const TEMPO_LIMITE_REQUISICAO_MS = 15000

const VAGAS_ESTIMADAS_POR_PAGINA = 12

const LIMITE_MAXIMO_POR_TERMO = 100

const LIMITE_MAXIMO_GLOBAL = 500

const CONCORRENCIA_DETALHES = 5

type LinkVagaSolides = {
  id: string

  url: string
}

function normalizarLimite(valor: number | undefined) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return 100
  }

  return Math.min(
    Math.max(Math.floor(valor), 1),
    LIMITE_MAXIMO_POR_TERMO
  )
}

function ehDominioSolides(hostname: string) {
  const normalizado = hostname.toLowerCase()

  return (
    normalizado === "vagas.solides.com.br" ||
    normalizado.endsWith(".vagas.solides.com.br")
  )
}

function extrairIdVaga(url: string) {
  try {
    const analisada = new URL(url)

    const partes = analisada.pathname
      .split("/")
      .filter(Boolean)

    const indiceVaga = partes.findIndex(
      parte => parte.toLowerCase() === "vaga"
    )

    return partes[indiceVaga + 1] ?? null
  } catch {
    return null
  }
}

async function buscarHtml(url: URL | string) {
  const controlador = new AbortController()

  const temporizador = setTimeout(
    () => controlador.abort(),
    TEMPO_LIMITE_REQUISICAO_MS
  )

  try {
    const resposta = await fetch(url, {
      redirect: "follow",

      signal: controlador.signal,

      headers: {
        Accept: "text/html,application/xhtml+xml",

        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",

        "User-Agent": "Mozilla/5.0 job-search/1.0"
      }
    })

    if (!resposta.ok) {
      throw new Error(
        `Sólides respondeu com status ${resposta.status}`
      )
    }

    return {
      html: await resposta.text(),

      urlFinal:
        resposta.url ||
        (typeof url === "string" ? url : url.toString())
    }
  } finally {
    clearTimeout(temporizador)
  }
}

function extrairLinksVagas(
  html: string,
  urlBase: string
): LinkVagaSolides[] {
  const $ = cheerio.load(html)

  const links = new Map<string, LinkVagaSolides>()

  $("a[href]").each((_indice, elemento) => {
    const href = $(elemento).attr("href")

    if (!href) {
      return
    }

    try {
      const url = new URL(href, urlBase)

      if (!ehDominioSolides(url.hostname)) {
        return
      }

      const id = extrairIdVaga(url.toString())

      if (!id) {
        return
      }

      if (!links.has(id)) {
        links.set(id, {
          id,

          url: url.toString()
        })
      }
    } catch {
      return
    }
  })

  return [...links.values()]
}

function criarUrlBusca(
  termo: string,
  pagina: number
) {
  const url = new URL(URL_BUSCA_SOLIDES)

  url.searchParams.set("title", termo)

  url.searchParams.set("page", String(pagina))

  return url
}

function normalizarData(valor: string | null) {
  if (!valor) {
    return null
  }

  const data = new Date(valor)

  return Number.isNaN(data.getTime())
    ? null
    : data.toISOString()
}

async function extrairDetalhe(
  link: LinkVagaSolides
): Promise<NewJob | null> {
  try {
    const pagina = await buscarHtml(link.url)

    const vaga = extrairVagaSolides(
      pagina.html,
      pagina.urlFinal
    )

    if (
      !vaga ||
      !vaga.titulo ||
      !vaga.descricao
    ) {
      return null
    }

    return {
      source: "solides",

      externalId: link.id,

      company:
        vaga.empresa?.trim() ||
        "Empresa não identificada",

      title: vaga.titulo.trim(),

      description: vaga.descricao.trim(),

      location: vaga.localizacao,

      remote: vaga.remoto,

      url:
        vaga.urlCandidatura?.trim() ||
        pagina.urlFinal,

      publishedAt: normalizarData(
        vaga.dataPublicacao
      ),

      partial: false
    }
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "erro desconhecido"

    console.warn(
      `Sólides: falha ao abrir ${link.url}: ${mensagem}`
    )

    return null
  }
}

async function mapearComConcorrencia<T, R>(
  itens: T[],
  concorrencia: number,
  executar: (item: T) => Promise<R>
) {
  const resultados = new Array<R>(itens.length)

  let proximoIndice = 0

  async function trabalhador() {
    while (true) {
      const indice = proximoIndice

      proximoIndice++

      if (indice >= itens.length) {
        return
      }

      resultados[indice] = await executar(
        itens[indice]
      )
    }
  }

  const quantidadeTrabalhadores = Math.min(
    Math.max(concorrencia, 1),
    Math.max(itens.length, 1)
  )

  await Promise.all(
    Array.from(
      { length: quantidadeTrabalhadores },
      () => trabalhador()
    )
  )

  return resultados
}

/**
 * Pesquisa diretamente o portal público da Sólides.
 *
 * Cada termo é enviado individualmente, exatamente como uma pesquisa
 * normal no campo de cargo do portal.
 *
 * Primeiro coleto e deduplico os links das listagens.
 * Só depois abro as páginas individuais, evitando baixar a mesma vaga
 * várias vezes quando ela aparece em cargos relacionados.
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

  const termos =
    gerarTermosBuscaNativaSolides(perfil)

  if (termos.length === 0) {
    return {
      source: "solides",

      jobs: []
    }
  }

  const limitePorTermo =
    normalizarLimite(limit)

  /**
   * O coletor pode encontrar vagas repetidas em vários termos.
   *
   * Com limite padrão 100, permito até 500 vagas únicas antes da
   * etapa de detalhes. Isso mantém cobertura alta sem deixar uma
   * sincronização crescer indefinidamente.
   */
  const limiteGlobal = Math.min(
    Math.max(limitePorTermo * 5, 200),
    LIMITE_MAXIMO_GLOBAL
  )

  const linksGlobais =
    new Map<string, LinkVagaSolides>()

  for (const termo of termos) {
    if (linksGlobais.size >= limiteGlobal) {
      break
    }

    const idsTermo = new Set<string>()

    const paginasMaximas = Math.min(
      Math.ceil(
        limitePorTermo /
          VAGAS_ESTIMADAS_POR_PAGINA
      ),
      10
    )

    for (
      let pagina = 1;
      pagina <= paginasMaximas;
      pagina++
    ) {
      if (
        idsTermo.size >= limitePorTermo ||
        linksGlobais.size >= limiteGlobal
      ) {
        break
      }

      let linksPagina: LinkVagaSolides[]

      try {
        const url =
          criarUrlBusca(termo, pagina)

        const resultado =
          await buscarHtml(url)

        linksPagina = extrairLinksVagas(
          resultado.html,
          resultado.urlFinal
        )
      } catch (erro) {
        const mensagem =
          erro instanceof Error
            ? erro.message
            : "erro desconhecido"

        console.warn(
          `Sólides: falha ao pesquisar "${termo}" na página ${pagina}: ${mensagem}`
        )

        break
      }

      if (linksPagina.length === 0) {
        break
      }

      let novosNestaPagina = 0

      for (const link of linksPagina) {
        if (idsTermo.size >= limitePorTermo) {
          break
        }

        if (linksGlobais.size >= limiteGlobal) {
          break
        }

        if (idsTermo.has(link.id)) {
          continue
        }

        idsTermo.add(link.id)

        novosNestaPagina++

        if (!linksGlobais.has(link.id)) {
          linksGlobais.set(
            link.id,
            link
          )
        }
      }

      if (novosNestaPagina === 0) {
        break
      }

      if (
        linksPagina.length <
        VAGAS_ESTIMADAS_POR_PAGINA
      ) {
        break
      }
    }

    console.log(
      `Sólides: "${termo}" consultado. ` +
        `${idsTermo.size} resultado(s) encontrado(s) para o termo.`
    )
  }

  const links = [
    ...linksGlobais.values()
  ]

  console.log(
    `Sólides: ${termos.length} termo(s) disponível(is), ` +
      `${links.length} vaga(s) única(s) localizada(s). ` +
      "Iniciando leitura dos detalhes."
  )

  const detalhes =
    await mapearComConcorrencia(
      links,
      CONCORRENCIA_DETALHES,
      extrairDetalhe
    )

  const jobs = detalhes.filter(
    (vaga): vaga is NewJob =>
      vaga !== null
  )

  console.log(
    `Sólides: ${jobs.length} vaga(s) válida(s) coletada(s).`
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