import {
  consultasBuscaVagas
} from "../config/search-queries.js"

import {
  buscarNaWeb
} from "../discovery/brave-search.js"

import {
  classificarPagina
} from "../discovery/page-classifier.js"

import type {
  PaginaClassificada
} from "../types/discovery.js"

/**
 * Removo somente parâmetros conhecidos de rastreamento.
 *
 * Não elimino todos os parâmetros porque algumas plataformas podem usar
 * query strings que realmente fazem parte da identificação da vaga.
 */
const parametrosRastreamento =
  new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "trackingId",
    "refId",
    "currentJobId",
    "position",
    "pageNum",
    "jobBoardSource"
  ])

/**
 * Crio uma representação estável da URL apenas para deduplicação.
 *
 * Continuo guardando a URL original encontrada para não correr o risco
 * de alterar um endereço necessário ao acesso da oportunidade.
 */
function normalizarUrlParaComparacao(
  url: string
) {
  try {
    const urlNormalizada =
      new URL(url)

    urlNormalizada.hash = ""

    for (
      const parametro
      of [
        ...urlNormalizada
          .searchParams
          .keys()
      ]
    ) {
      if (
        parametrosRastreamento.has(
          parametro
        )
      ) {
        urlNormalizada
          .searchParams
          .delete(parametro)
      }
    }

    urlNormalizada
      .searchParams
      .sort()

    if (
      urlNormalizada.pathname.length > 1
    ) {
      urlNormalizada.pathname =
        urlNormalizada.pathname
          .replace(/\/+$/, "")
    }

    return urlNormalizada
      .toString()
      .toLowerCase()
  } catch {
    return url
      .trim()
      .toLowerCase()
  }
}

/**
 * Executo todas as consultas configuradas e deduplico páginas que foram
 * encontradas por mais de uma busca.
 *
 * Uma mesma vaga pode aparecer na pesquisa geral, na busca pela cidade
 * e novamente numa consulta específica para LinkedIn ou algum ATS.
 */
export async function descobrirPaginasVagas(): Promise<
  PaginaClassificada[]
> {
  const paginasDescobertas =
    new Map<
      string,
      PaginaClassificada
    >()

  for (
    const consulta
    of consultasBuscaVagas
  ) {
    const resultado =
      await buscarNaWeb(
        consulta
      )

    for (
      const pagina
      of resultado.paginas
    ) {
      const chave =
        normalizarUrlParaComparacao(
          pagina.url
        )

      if (
        paginasDescobertas.has(
          chave
        )
      ) {
        continue
      }

      const paginaClassificada =
        classificarPagina(
          pagina
        )

      paginasDescobertas.set(
        chave,
        paginaClassificada
      )
    }
  }

  return [
    ...paginasDescobertas.values()
  ]
}