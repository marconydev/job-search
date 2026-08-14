import { NextRequest, NextResponse } from "next/server"

import { obterUrlBackend } from "@/lib/api-servidor"

import type { StatusVaga } from "@/types/painel"

export const runtime = "nodejs"

type ContextoRota = {
  params: Promise<{
    id: string
  }>
}

const statusPermitidos = new Set<StatusVaga>(["relevant", "viewed", "applied", "ignored"])

/**
 * Eu mantenho esta alteração passando pelo próprio Next.
 *
 * Assim o navegador conversa somente com o frontend e o Next fica
 * responsável por encaminhar a ação para a API Express.
 */
export async function PATCH(requisicao: NextRequest, contexto: ContextoRota) {
  const { id } = await contexto.params

  const idVaga = Number(id)

  if (!Number.isInteger(idVaga) || idVaga <= 0) {
    return NextResponse.json(
      {
        mensagem: "Identificador da vaga inválido."
      },
      {
        status: 400
      }
    )
  }

  let corpo: {
    status?: unknown
  }

  try {
    corpo = await requisicao.json()
  } catch {
    return NextResponse.json(
      {
        mensagem: "Não consegui interpretar os dados enviados."
      },
      {
        status: 400
      }
    )
  }

  if (typeof corpo.status !== "string" || !statusPermitidos.has(corpo.status as StatusVaga)) {
    return NextResponse.json(
      {
        mensagem: "O status informado não é válido."
      },
      {
        status: 400
      }
    )
  }

  try {
    const resposta = await fetch(`${obterUrlBackend()}/jobs/${idVaga}/status`, {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        status: corpo.status
      }),

      cache: "no-store"
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      return NextResponse.json(
        {
          mensagem: dados.message ?? "Não foi possível atualizar a oportunidade."
        },
        {
          status: resposta.status
        }
      )
    }

    return NextResponse.json(dados)
  } catch (erro) {
    console.error("Erro ao atualizar vaga pelo frontend:", erro)

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
