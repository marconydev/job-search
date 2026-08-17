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
 * Faço somente uma chamada à Brave para cada estratégia configurada.
 *
 * Cada chamada solicita até 20 resultados, que é o limite máximo do
 * endpoint Web Search.
 *
 * O controle financeiro e de quantidade de chamadas continua sendo
 * responsabilidade da camada de descoberta.
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
   * Priorizo resultados brasileiros, mas não restrinjo o idioma.
   *
   * Muitas vagas disponíveis para profissionais no Brasil são publicadas
   * em inglês mesmo quando aceitam candidatos brasileiros.
   */
  url.searchParams.set("country", "BR")

  /**
   * Como a sincronização passa a ter cobertura diária, busco a última
   * semana.
   *
   * Isso cobre eventuais atrasos de indexação sem trazer um mês inteiro
   * de resultados repetidos em todas as execuções.
   */
  url.searchParams.set("freshness", "pw")

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

    paginas
  }
}
