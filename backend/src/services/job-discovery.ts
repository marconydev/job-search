import { jobSearchQueries } from "../config/search-queries.js"
import { searchWeb } from "../discovery/brave-search.js"

import type { DiscoveredPage } from "../types/discovery.js"

/**
 * Executa as pesquisas configuradas e reúne as páginas encontradas.
 *
 * Uma mesma vaga pode aparecer em consultas diferentes, então usamos
 * a URL como chave para evitar repetir o mesmo resultado nesta etapa.
 */
export async function discoverJobPages() {
  const discoveredPages = new Map<string, DiscoveredPage>()

  for (const query of jobSearchQueries) {
    const result = await searchWeb(query)

    for (const page of result.pages) {
      if (!discoveredPages.has(page.url)) {
        discoveredPages.set(page.url, page)
      }
    }
  }

  return [...discoveredPages.values()]
}