import type {
  DiscoveredPage,
  WebDiscoveryResult
} from "../types/discovery.js"

const BRAVE_SEARCH_URL =
  "https://api.search.brave.com/res/v1/web/search"

type BraveWebResult = {
  title: string
  url: string
  description?: string
}

type BraveSearchResponse = {
  web?: {
    results?: BraveWebResult[]
  }
}

/**
 * Faz uma busca na internet usando a Brave Search API.
 *
 * O resultado ainda não é tratado como vaga. Nesta etapa só
 * descobrimos páginas que podem conter oportunidades relevantes.
 */
export async function searchWeb(
  query: string,
  count = 20
): Promise<WebDiscoveryResult> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY

  if (!apiKey) {
    throw new Error(
      "BRAVE_SEARCH_API_KEY não foi configurada no ambiente"
    )
  }

  const url = new URL(BRAVE_SEARCH_URL)

  url.searchParams.set("q", query)
  url.searchParams.set("count", String(Math.min(count, 20)))

  // Para busca de emprego, resultados muito antigos têm pouco valor.
  // A janela de um mês mantém a descoberta mais próxima de vagas ativas.
  url.searchParams.set("freshness", "pm")

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey
    }
  })

  if (!response.ok) {
    throw new Error(
      `Brave Search respondeu com status ${response.status}`
    )
  }

  const data = (await response.json()) as BraveSearchResponse

  const pages: DiscoveredPage[] =
    data.web?.results?.map((result) => ({
      source: "brave-search",
      query,
      title: result.title,
      url: result.url,
      description: result.description || null
    })) ?? []

  return {
    provider: "brave-search",
    pages
  }
}