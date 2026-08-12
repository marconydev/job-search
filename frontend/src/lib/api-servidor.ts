import "server-only"

import type {
  DadosPainel
} from "@/types/painel"

/**
 * Eu mantenho o endereço do backend somente no servidor do Next.
 *
 * Desta forma o navegador não precisa conhecer diretamente a porta
 * utilizada pela API Express e eu evito depender de CORS no frontend.
 */
export function obterUrlBackend() {
  const endereco =
    process.env.API_BACKEND_URL ??
    "http://localhost:3333"

  return endereco.replace(
    /\/+$/,
    ""
  )
}

/**
 * Eu carrego os dados do dashboard diretamente no servidor.
 *
 * Não utilizo cache aqui porque quero que uma atualização de status
 * possa aparecer imediatamente quando a página for atualizada.
 */
export async function obterDadosPainel():
  Promise<DadosPainel> {
  const resposta =
    await fetch(
      `${obterUrlBackend()}/jobs/dashboard`,
      {
        cache: "no-store"
      }
    )

  if (!resposta.ok) {
    throw new Error(
      `Não foi possível carregar o dashboard. HTTP ${resposta.status}.`
    )
  }

  return resposta.json()
}