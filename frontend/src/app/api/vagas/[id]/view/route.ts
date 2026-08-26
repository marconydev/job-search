import { NextResponse } from "next/server"

import { requisitarBackend } from "@/lib/api-servidor"

export const runtime = "nodejs"

type ContextoRota = {
  params: Promise<{
    id: string
  }>
}

/**
 * Registro a abertura da publicação sem alterar o status da oportunidade.
 */
export async function PATCH(_requisicao: Request, contexto: ContextoRota) {
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

  try {
    const resposta = await requisitarBackend(`/jobs/${idVaga}/view`, {
      method: "PATCH",

      cache: "no-store"
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      return NextResponse.json(
        {
          mensagem: dados.message ?? "Não foi possível registrar a visualização."
        },
        {
          status: resposta.status
        }
      )
    }

    return NextResponse.json(dados)
  } catch (erro) {
    console.error("Erro ao registrar visualização pelo frontend:", erro)

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
