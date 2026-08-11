import type {
  PaginaDescoberta,
  ResultadoDescobertaWeb
} from "../types/discovery.js"

const URL_BRAVE_SEARCH =
  "https://api.search.brave.com/res/v1/web/search"

/**
 * Mantenho os nomes dos campos da resposta exatamente como a Brave
 * Search os fornece, porque eles fazem parte do contrato externo da API.
 */
type ResultadoWebBrave = {
  title: string
  url: string
  description?: string
}

type RespostaBraveSearch = {
  web?: {
    results?: ResultadoWebBrave[]
  }
}

/**
 * Faço uma busca na internet usando a Brave Search API.
 *
 * Nesta etapa apenas descubro páginas que podem conter oportunidades.
 * A confirmação de que existe uma vaga acontece posteriormente.
 */
export async function buscarNaWeb(
  consulta: string,
  quantidade = 20
): Promise<ResultadoDescobertaWeb> {
  const chaveApi = process.env.BRAVE_SEARCH_API_KEY

  if (!chaveApi) {
    throw new Error(
      "BRAVE_SEARCH_API_KEY não foi configurada no ambiente"
    )
  }

  const url = new URL(URL_BRAVE_SEARCH)

  url.searchParams.set("q", consulta)

  url.searchParams.set(
    "count",
    String(Math.min(quantidade, 20))
  )

  // Para busca de emprego, resultados muito antigos têm pouco valor.
  // Uso uma janela de um mês para priorizar oportunidades recentes.
  url.searchParams.set("freshness", "pm")

  const resposta = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": chaveApi
    }
  })

  if (!resposta.ok) {
    throw new Error(
      `Brave Search respondeu com status ${resposta.status}`
    )
  }

  const dados =
    (await resposta.json()) as RespostaBraveSearch

  const paginas: PaginaDescoberta[] =
    dados.web?.results?.map((resultado) => ({
      origem: "brave-search",
      consulta,
      titulo: resultado.title,
      url: resultado.url,
      descricao: resultado.description || null
    })) ?? []

  return {
    provedor: "brave-search",
    paginas
  }
}