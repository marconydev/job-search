import { NextResponse } from "next/server"

import { requisitarBackend } from "@/lib/api-servidor"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"

type RespostaBackend = {
  message?: unknown
  [chave: string]: unknown
}

/**
 * Sanitiza o parametro ?dias (default 7, range 1..30).
 * Exportada para permitir teste direto do boundary.
 */
export function sanitizarDias(valor: string | null | undefined): number {
  if (valor == null || valor === "") return 7
  const bruto = Math.floor(Number(valor))
  if (!Number.isFinite(bruto) || bruto <= 0) return 7
  return Math.min(bruto, 30)
}

async function lerRespostaBackend(resposta: Response): Promise<RespostaBackend> {
  const texto = await resposta.text()
  if (!texto.trim()) return {}
  try {
    return JSON.parse(texto) as RespostaBackend
  } catch {
    return { message: texto.trim() }
  }
}

/**
 * Rota-proxy de leitura. Repassa ?dias para o backend.
 * Nunca dispara coleta nem consome Brave.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const dias = sanitizarDias(url.searchParams.get("dias"))

  try {
    const resposta = await requisitarBackend(`/jobs/telemetria/resumo?dias=${dias}`, {
      cache: "no-store"
    })

    const dados = await lerRespostaBackend(resposta)

    if (!resposta.ok) {
      return NextResponse.json(
        {
          mensagem:
            typeof dados.message === "string"
              ? dados.message
              : "Nao foi possivel consultar a telemetria."
        },
        { status: resposta.status }
      )
    }

    return NextResponse.json(dados)
  } catch (erro) {
    console.error("Erro ao consultar resumo da telemetria:", erro)

    return NextResponse.json(
      { mensagem: "Nao foi possivel acessar o backend." },
      { status: 503 }
    )
  }
}
