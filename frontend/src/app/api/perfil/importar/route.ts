import { NextResponse } from "next/server"

import { obterUrlBackend } from "@/lib/api-servidor"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"

/**
 * Eu recebo o currículo pelo frontend e encaminho o arquivo ao backend.
 *
 * Não salvo o arquivo no Next e não defino manualmente o Content-Type,
 * porque o próprio FormData precisa gerar corretamente o boundary do
 * multipart/form-data.
 */
export async function POST(request: Request) {
  try {
    const dadosRecebidos = await request.formData()

    const arquivo = dadosRecebidos.get("arquivo")

    if (!(arquivo instanceof File)) {
      return NextResponse.json(
        {
          mensagem: "Selecione um currículo para importar."
        },
        {
          status: 400
        }
      )
    }

    const dadosBackend = new FormData()

    dadosBackend.append("arquivo", arquivo, arquivo.name)

    const resposta = await fetch(`${obterUrlBackend()}/perfil/importar`, {
      method: "POST",

      body: dadosBackend,

      cache: "no-store"
    })

    const retorno = await resposta.json()

    if (!resposta.ok) {
      return NextResponse.json(
        {
          mensagem: retorno.message ?? "Não foi possível analisar o currículo."
        },
        {
          status: resposta.status
        }
      )
    }

    /**
     * O backend utiliza o texto completo para realizar a análise.
     *
     * A interface não precisa receber todo esse conteúdo, então devolvo
     * somente as sugestões estruturadas e os dados básicos do arquivo.
     */
    return NextResponse.json({
      arquivo: retorno.arquivo,

      sugestoes: retorno.sugestoes,

      avisos: retorno.avisos
    })
  } catch (erro) {
    console.error("Erro ao importar currículo pelo frontend:", erro)

    return NextResponse.json(
      {
        mensagem: "Não foi possível acessar o backend para analisar o currículo."
      },
      {
        status: 503
      }
    )
  }
}
