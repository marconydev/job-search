import {
  NextRequest,
  NextResponse
} from "next/server"

import {
  obterUrlBackend
} from "@/lib/api-servidor"

export const runtime =
  "nodejs"

export const dynamic =
  "force-dynamic"

/**
 * Eu disponibilizo a leitura também pela API do Next porque ela será
 * útil quando a própria interface precisar atualizar o perfil sem
 * recarregar toda a página.
 */
export async function GET() {
  try {
    const resposta =
      await fetch(
        `${obterUrlBackend()}/perfil`,
        {
          cache:
            "no-store"
        }
      )

    const retorno =
      await resposta.json()

    if (!resposta.ok) {
      return NextResponse.json(
        {
          mensagem:
            retorno.message ??
            "Não foi possível carregar o perfil."
        },
        {
          status:
            resposta.status
        }
      )
    }

    return NextResponse.json(
      retorno
    )
  } catch (erro) {
    console.error(
      "Erro ao carregar perfil pelo frontend:",
      erro
    )

    return NextResponse.json(
      {
        mensagem:
          "Não foi possível acessar o backend."
      },
      {
        status:
          503
      }
    )
  }
}

/**
 * Eu encaminho o perfil completo ao backend.
 *
 * A validação definitiva continua sendo responsabilidade da API
 * Express antes da gravação no PostgreSQL.
 */
export async function PUT(
  request:
    NextRequest
) {
  try {
    const corpo =
      await request.json()

    const resposta =
      await fetch(
        `${obterUrlBackend()}/perfil`,
        {
          method:
            "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              corpo
            ),

          cache:
            "no-store"
        }
      )

    const retorno =
      await resposta.json()

    if (!resposta.ok) {
      return NextResponse.json(
        {
          mensagem:
            retorno.message ??
            "Não foi possível salvar o perfil."
        },
        {
          status:
            resposta.status
        }
      )
    }

    return NextResponse.json(
      retorno
    )
  } catch (erro) {
    console.error(
      "Erro ao salvar perfil pelo frontend:",
      erro
    )

    return NextResponse.json(
      {
        mensagem:
          "Não foi possível salvar o perfil profissional."
      },
      {
        status:
          503
      }
    )
  }
}