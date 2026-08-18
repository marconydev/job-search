import "server-only"

import type { DadosPainel } from "@/types/painel"

import type { PerfilProfissionalComMetadados } from "@/types/perfil"

/**
 * Eu mantenho o endereço do backend somente no servidor do Next.
 *
 * Desta forma o navegador não precisa conhecer diretamente o endereço
 * da API Express e eu continuo sem depender de CORS no frontend.
 */
export function obterUrlBackend() {
  const endereco = process.env.API_BACKEND_URL ?? "http://localhost:3333"

  return endereco.replace(/\/+$/, "")
}

/**
 * O token utilizado entre Next e Express também existe somente no lado
 * servidor.
 *
 * Eu nunca utilizo NEXT_PUBLIC_ neste valor porque ele não deve ser
 * enviado para o navegador.
 */
function obterTokenAcessoBackend() {
  const token = process.env.API_ACCESS_TOKEN?.trim()

  if (!token) {
    throw new Error("API_ACCESS_TOKEN não foi configurado no frontend.")
  }

  return token
}

/**
 * Eu centralizo toda comunicação entre o servidor Next e o Express.
 *
 * Qualquer rota que utilizar esta função recebe automaticamente o
 * Authorization necessário, evitando que alguma chamada nova esqueça
 * de proteger o backend.
 */
export async function requisitarBackend(caminho: string, opcoes: RequestInit = {}) {
  const caminhoNormalizado = caminho.startsWith("/") ? caminho : `/${caminho}`

  const headers = new Headers(opcoes.headers)

  headers.set("Authorization", `Bearer ${obterTokenAcessoBackend()}`)

  return fetch(`${obterUrlBackend()}${caminhoNormalizado}`, {
    ...opcoes,

    headers
  })
}

/**
 * Eu carrego os dados do dashboard diretamente no servidor.
 *
 * Não utilizo cache porque quero enxergar imediatamente qualquer mudança
 * no estado das oportunidades.
 */
export async function obterDadosPainel(): Promise<DadosPainel> {
  const resposta = await requisitarBackend("/jobs/dashboard", {
    cache: "no-store"
  })

  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar o dashboard. HTTP ${resposta.status}.`)
  }

  return resposta.json()
}

/**
 * Eu também carrego o perfil pelo servidor Next para manter o Express
 * fora da comunicação direta com o navegador.
 */
export async function obterPerfilProfissional(): Promise<PerfilProfissionalComMetadados> {
  const resposta = await requisitarBackend("/perfil", {
    cache: "no-store"
  })

  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar o perfil profissional. HTTP ${resposta.status}.`)
  }

  return resposta.json()
}
