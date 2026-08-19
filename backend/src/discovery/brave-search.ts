import type { PaginaDescoberta, ResultadoDescobertaWeb } from "../types/discovery.js"

const URL_BRAVE_SEARCH = "https://api.search.brave.com/res/v1/web/search"

type ResultadoWebBrave = {
  title: string

  url: string

  description?: string
}

type RespostaBraveSearch = {
  query?: {
    more_results_available?: boolean
  }

  web?: {
    results?: ResultadoWebBrave[]
  }
}

/**
 * Cada offset representa uma página da Brave.
 *
 * A API aceita até 20 resultados por página e offsets entre 0 e 9.
 */
function normalizarPagina(pagina: number) {
  if (!Number.isFinite(pagina)) {
    return 0
  }

  return Math.min(Math.max(Math.floor(pagina), 0), 9)
}

export async function buscarNaWeb(
  consulta: string,
  quantidade = 20,
  pagina = 0
): Promise<ResultadoDescobertaWeb> {
  const chaveApi = process.env.BRAVE_SEARCH_API_KEY

  if (!chaveApi) {
    throw new Error("BRAVE_SEARCH_API_KEY não foi configurada no ambiente")
  }

  const url = new URL(URL_BRAVE_SEARCH)

  url.searchParams.set("q", consulta)

  url.searchParams.set("count", String(Math.min(Math.max(quantidade, 1), 20)))

  url.searchParams.set("offset", String(normalizarPagina(pagina)))

  url.searchParams.set("country", "BR")

  /**
   * Continuo utilizando o último mês como preferência de atualidade.
   *
   * A aplicação possui deduplicação e validação próprias, portanto não
   * dependo apenas da data para decidir se uma oportunidade é válida.
   */
  url.searchParams.set("freshness", "pm")

  url.searchParams.set("result_filter", "web")

  const resposta = await fetch(url, {
    headers: {
      Accept: "application/json",

      "X-Subscription-Token": chaveApi
    }
  })

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "")

    const detalhe = corpo.replace(/\s+/g, " ").trim().slice(0, 300)

    throw new Error(
      [
        `Brave Search respondeu com status ${resposta.status}.`,

        detalhe ? `Detalhe: ${detalhe}` : ""
      ]
        .filter(Boolean)
        .join(" ")
    )
  }

  const dados = (await resposta.json()) as RespostaBraveSearch

  const paginas: PaginaDescoberta[] =
    dados.web?.results?.map(resultado => ({
      origem: "brave-search",

      consulta,

      titulo: resultado.title,

      url: resultado.url,

      descricao: resultado.description ?? null
    })) ?? []

  return {
    provedor: "brave-search",

    paginas,

    maisResultadosDisponiveis: dados.query?.more_results_available === true
  }
}
