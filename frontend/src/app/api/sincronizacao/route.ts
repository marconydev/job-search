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

type CorpoSincronizacao = {
  usarBrave?: boolean

  limiteChamadasBrave?: number
}

function normalizarLimiteBrave(
  valor:
    unknown
) {
  if (
    typeof valor !==
      "number" ||
    !Number.isFinite(
      valor
    )
  ) {
    return 0
  }

  return Math.min(
    6,
    Math.max(
      0,
      Math.floor(
        valor
      )
    )
  )
}

/**
 * Eu mantenho a Brave desativada por padrão também no frontend.
 *
 * Para autorizar uma busca web real, o cliente precisa enviar
 * explicitamente usarBrave=true. O backend continua sendo a última
 * camada de proteção e aplica o próprio limite diário.
 */
export async function POST(
  request:
    NextRequest
) {
  try {
    let corpo:
      CorpoSincronizacao =
      {}

    try {
      corpo =
        await request.json() as
          CorpoSincronizacao
    } catch {
      /**
       * Uma requisição sem corpo representa uma sincronização segura.
       *
       * Eu não transformo ausência de parâmetros em autorização Brave.
       */
      corpo =
        {}
    }

    const usarBrave =
      corpo.usarBrave ===
      true

    const limiteChamadasBrave =
      usarBrave
        ? normalizarLimiteBrave(
            corpo.limiteChamadasBrave
          )
        : 0

    const resposta =
      await fetch(
        `${obterUrlBackend()}/jobs/sync`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              usarBrave,

              limiteChamadasBrave
            }),

          cache:
            "no-store"
        }
      )

    const dados =
      await resposta.json()

    if (!resposta.ok) {
      return NextResponse.json(
        {
          mensagem:
            dados.message ??
            "Não foi possível atualizar as oportunidades."
        },
        {
          status:
            resposta.status
        }
      )
    }

    return NextResponse.json(
      dados
    )
  } catch (erro) {
    console.error(
      "Erro durante a sincronização:",
      erro
    )

    return NextResponse.json(
      {
        mensagem:
          "Não foi possível acessar o backend durante a sincronização."
      },
      {
        status:
          503
      }
    )
  }
}