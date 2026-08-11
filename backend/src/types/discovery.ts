/**
 * Representa uma página encontrada durante a busca na internet.
 *
 * Nesse momento ainda não tratamos o resultado como uma vaga válida.
 * Primeiro precisamos abrir a página e confirmar o conteúdo.
 */
export type DiscoveredPage = {
  source: string
  query: string
  title: string
  url: string
  description: string | null
}

/**
 * Resultado bruto de uma busca feita por um provedor externo.
 */
export type WebDiscoveryResult = {
  provider: string
  pages: DiscoveredPage[]
}