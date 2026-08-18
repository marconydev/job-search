import { NextResponse } from "next/server"

import { requisitarBackend } from "@/lib/api-servidor"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"

type RespostaBackend = {
  message?: unknown

  [chave: string]: unknown
}

async function lerRespostaBackend(resposta: Response): Promise<RespostaBackend> {
  const texto = await resposta.text()

  if (!texto.trim()) {
    return {}
  }

  try {
    return JSON.parse(texto) as RespostaBackend
  } catch {
    return {
      message: texto.trim()
    }
  }
}

/**
 * Esta rota apenas lê:
 *
 * - orçamento Brave;
 * - cache;
 * - execução atual ou anterior da sincronização.
 *
 * Nenhuma chamada Brave é realizada aqui.
 */
export async function GET() {
  try {
    const resposta = await requisitarBackend("/jobs/sync/status", {
      cache: "no-store"
    })

    const dados = await lerRespostaBackend(resposta)

    if (!resposta.ok) {
      return NextResponse.json(
        {
          mensagem:
            typeof dados.message === "string"
              ? dados.message
              : "Não foi possível consultar o status da sincronização."
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
