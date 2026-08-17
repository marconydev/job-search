import { NextRequest, NextResponse } from "next/server"

import { obterUrlBackend } from "@/lib/api-servidor"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"

type CorpoSincronizacao = {
  usarBrave?: boolean

  limiteChamadasBrave?: number
}

/**
 * Eu apenas normalizo o valor recebido pelo frontend.
 *
 * O controle definitivo de orçamento continua sendo feito no backend,
 * onde existem os limites diário e mensal.
 */
function normalizarLimiteBrave(valor: unknown) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return 0
  }

  return Math.max(0, Math.floor(valor))
}

/**
 * Eu mantenho a Brave desativada por padrão também na camada Next.
 *
 * Uma busca real só é autorizada quando o cliente envia explicitamente
 * usarBrave=true.
 *
 * Não aplico aqui um segundo limite fixo porque o backend já protege:
 *
 * - limite diário;
 * - limite mensal;
 * - quantidade solicitada para a execução.
 *
 * Dessa forma evito que esta camada silenciosamente reduza uma busca
 * autorizada, como acontecia anteriormente com o antigo limite de 6.
 */
export async function POST(request: NextRequest) {
  try {
    let corpo: CorpoSincronizacao = {}

    try {
      corpo = (await request.json()) as CorpoSincronizacao
    } catch {
      /**
       * Uma requisição sem corpo continua sendo tratada como segura.
       *
       * Ausência de parâmetros nunca representa autorização para usar
       * consultas Brave.
       */
      corpo = {}
    }

    const usarBrave = corpo.usarBrave === true

    const limiteChamadasBrave = usarBrave ? normalizarLimiteBrave(corpo.limiteChamadasBrave) : 0

    const resposta = await fetch(`${obterUrlBackend()}/jobs/sync`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        usarBrave,

        limiteChamadasBrave
      }),

      cache: "no-store"
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      return NextResponse.json(
        {
          mensagem: dados.message ?? "Não foi possível atualizar as oportunidades."
        },
        {
          status: resposta.status
        }
      )
    }

    return NextResponse.json(dados)
  } catch (erro) {
    console.error("Erro durante a sincronização:", erro)

    return NextResponse.json(
      {
        mensagem: "Não foi possível acessar o backend durante a sincronização."
      },
      {
        status: 503
      }
    )
  }
}
