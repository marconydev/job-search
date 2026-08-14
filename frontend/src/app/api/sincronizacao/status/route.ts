import { NextResponse } from "next/server"

import { obterUrlBackend } from "@/lib/api-servidor"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"

/**
 * Eu mantenho esta consulta separada da sincronização real.
 *
 * Esta rota apenas lê o contador e o estado atual do cache. Consultá-la
 * pelo dashboard não consome nenhuma chamada da Brave.
 */
export async function GET() {
  try {
    const resposta = await fetch(`${obterUrlBackend()}/jobs/sync/status`, {
      cache: "no-store"
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      return NextResponse.json(
        {
          mensagem: dados.message ?? "Não foi possível consultar o status da sincronização."
        },
        {
          status: resposta.status
        }
      )
    }

    return NextResponse.json(dados)
  } catch (erro) {
    console.error("Erro ao consultar a sincronização:", erro)

    return NextResponse.json(
      {
        mensagem: "Não foi possível acessar o backend."
      },
      {
        status: 503
      }
    )
  }
}
