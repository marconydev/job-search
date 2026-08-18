import { NextRequest, NextResponse } from "next/server"

import { requisitarBackend } from "@/lib/api-servidor"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"

type CorpoSincronizacao = {
  usarBrave?: boolean

  limiteChamadasBrave?: number
}

type RespostaBackend = {
  message?: unknown

  [chave: string]: unknown
}

function normalizarLimiteBrave(valor: unknown) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return 0
  }

  return Math.max(0, Math.floor(valor))
}

/**
 * Eu não assumo mais que toda resposta HTTP possui um JSON completo.
 *
 * Se uma infraestrutura intermediária encerrar a conexão ou devolver
 * corpo vazio, a rota continua produzindo uma resposta controlada.
 */
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

function obterMensagem(dados: RespostaBackend, fallback: string) {
  return typeof dados.message === "string" ? dados.message : fallback
}

/**
 * Esta rota agora espera somente o backend confirmar que a execução foi
 * iniciada.
 *
 * O trabalho pesado continua no Render e o frontend acompanha o estado
 * posteriormente através de /api/sincronizacao/status.
 */
export async function POST(request: NextRequest) {
  try {
    let corpo: CorpoSincronizacao = {}

    try {
      corpo = (await request.json()) as CorpoSincronizacao
    } catch {
      corpo = {}
    }

    const usarBrave = corpo.usarBrave === true

    const limiteChamadasBrave = usarBrave ? normalizarLimiteBrave(corpo.limiteChamadasBrave) : 0

    const resposta = await requisitarBackend("/jobs/sync", {
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

    const dados = await lerRespostaBackend(resposta)

    /**
     * Converto a nomenclatura do backend para o padrão usado pelas rotas
     * do frontend, mas preservo os demais campos como execucao.
     */
    const retorno = {
      ...dados,

      mensagem: obterMensagem(
        dados,
        resposta.ok ? "Sincronização iniciada." : "Não foi possível iniciar a sincronização."
      )
    }

    return NextResponse.json(retorno, {
      status: resposta.status
    })
  } catch (erro) {
    console.error("Erro ao iniciar sincronização:", erro)

    return NextResponse.json(
      {
        mensagem: "Não foi possível acessar o backend para iniciar a sincronização."
      },
      {
        status: 503
      }
    )
  }
}
