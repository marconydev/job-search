import { consultasBuscaVagas } from "../config/search-queries.js"
import { buscarNaWeb } from "../discovery/brave-search.js"
import { classificarPagina } from "../discovery/page-classifier.js"

import type { PaginaClassificada } from "../types/discovery.js"

/**
 * Executo as pesquisas configuradas e classifico cada página encontrada.
 *
 * Uso a URL como chave porque a mesma oportunidade pode aparecer em
 * consultas diferentes. Dessa forma evito devolver a mesma página
 * mais de uma vez nesta etapa.
 */
export async function descobrirPaginasVagas(): Promise<
  PaginaClassificada[]
> {
  const paginasDescobertas = new Map<string, PaginaClassificada>()

  for (const consulta of consultasBuscaVagas) {
    const resultado = await buscarNaWeb(consulta)

    for (const pagina of resultado.pages) {
      if (paginasDescobertas.has(pagina.url)) {
        continue
      }

      const paginaClassificada = classificarPagina(pagina)

      paginasDescobertas.set(
        pagina.url,
        paginaClassificada
      )
    }
  }

  return [...paginasDescobertas.values()]
}

/**
 * Mantenho este alias temporariamente porque o script de descoberta
 * ainda usa o nome antigo. Removo assim que migrar esse script.
 */
export const discoverJobPages = descobrirPaginasVagas