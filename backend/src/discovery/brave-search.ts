import type {
  PaginaDescoberta,
  ResultadoDescobertaWeb
} from "../types/discovery.js"

const URL_BRAVE_SEARCH =
  "https://api.search.brave.com/res/v1/web/search"

/**
 * Mantenho estes tipos com os nomes dos campos exatamente como a
 * Brave Search devolve na API.
 *
 * Aqui não traduzo "web", "results", "title" ou "description" porque
 * esses nomes pertencem ao contrato externo da plataforma.
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
 * Nesta etapa ainda não considero os resultados como vagas válidas.
 * Apenas descubro páginas que podem conter oportunidades relevantes.
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
  // Uso uma janela de um mês para priorizar oportunidades mais recentes.
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

  const dados = (await resposta.json()) as RespostaBraveSearch

  const paginas: PaginaDescoberta[] =
    dados.web?.results?.map((resultado) => ({
      source: "brave-search",
      query: consulta,
      title: resultado.title,
      url: resultado.url,
      description: resultado.description || null
    })) ?? []

  return {
    provider: "brave-search",
    pages: paginas
  }
}

/**
 * Mantenho este alias apenas enquanto os arquivos restantes ainda usam
 * o nome antigo. Removo quando concluir toda a migração para português.
 */
export const searchWeb = buscarNaWeb