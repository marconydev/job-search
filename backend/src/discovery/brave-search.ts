import type { PaginaDescoberta, ResultadoDescobertaWeb } from "../types/discovery.js"

const URL_BRAVE_SEARCH = "https://api.search.brave.com/res/v1/web/search"

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
 * Faço somente uma chamada à Brave por consulta.
 *
 * O controle de quantidade diária e o cache ficam na camada de
 * descoberta para impedir consumo acidental da API.
 */
export async function buscarNaWeb(
  consulta: string,
  quantidade = 20
): Promise<ResultadoDescobertaWeb> {
  const chaveApi = process.env.BRAVE_SEARCH_API_KEY

  if (!chaveApi) {
    throw new Error("BRAVE_SEARCH_API_KEY não foi configurada no ambiente")
  }

  const url = new URL(URL_BRAVE_SEARCH)

  url.searchParams.set("q", consulta)

  url.searchParams.set("count", String(Math.min(Math.max(quantidade, 1), 20)))

  /**
   * Como minha busca profissional é direcionada ao Brasil, não deixo
   * a API utilizar a região padrão.
   */
  url.searchParams.set("country", "BR")

  /**
   * Para descoberta de vagas novas continuo priorizando o último mês.
   */
  url.searchParams.set("freshness", "pm")

  const resposta = await fetch(url, {
    headers: {
      Accept: "application/json",

      "X-Subscription-Token": chaveApi
    }
  })

  if (!resposta.ok) {
    throw new Error(`Brave Search respondeu com status ${resposta.status}`)
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

    paginas
  }
}
