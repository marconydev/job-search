import { timingSafeEqual } from "node:crypto"

import { NextRequest, NextResponse } from "next/server"

/**
 * Eu comparo as credenciais de forma segura sem depender apenas de uma
 * comparação direta entre strings.
 */
function valoresSaoIguais(recebido: string, esperado: string) {
  const bufferRecebido = Buffer.from(recebido)

  const bufferEsperado = Buffer.from(esperado)

  if (bufferRecebido.length !== bufferEsperado.length) {
    return false
  }

  return timingSafeEqual(bufferRecebido, bufferEsperado)
}

function solicitarAutenticacao() {
  return new NextResponse("Acesso restrito.", {
    status: 401,

    headers: {
      "WWW-Authenticate": 'Basic realm="Job Search", charset="UTF-8"',

      "Cache-Control": "no-store"
    }
  })
}

/**
 * Esta aplicação é pessoal.
 *
 * Eu utilizo uma autenticação simples no ponto de entrada do Next para
 * impedir que o dashboard, perfil e APIs do frontend fiquem públicos.
 *
 * Se as credenciais não estiverem configuradas, preferi bloquear o
 * sistema em vez de liberar acesso acidentalmente.
 */
export function proxy(request: NextRequest) {
  const usuarioEsperado = process.env.APP_USER?.trim()

  const senhaEsperada = process.env.APP_PASSWORD ?? ""

  if (!usuarioEsperado || !senhaEsperada) {
    return new NextResponse("Acesso ainda não configurado.", {
      status: 503,

      headers: {
        "Cache-Control": "no-store"
      }
    })
  }

  const autorizacao = request.headers.get("authorization")

  if (!autorizacao?.startsWith("Basic ")) {
    return solicitarAutenticacao()
  }

  const codificado = autorizacao.slice("Basic ".length)

  let credenciais: string

  try {
    credenciais = Buffer.from(codificado, "base64").toString("utf8")
  } catch {
    return solicitarAutenticacao()
  }

  const separador = credenciais.indexOf(":")

  if (separador < 0) {
    return solicitarAutenticacao()
  }

  const usuarioRecebido = credenciais.slice(0, separador)

  const senhaRecebida = credenciais.slice(separador + 1)

  if (
    !valoresSaoIguais(usuarioRecebido, usuarioEsperado) ||
    !valoresSaoIguais(senhaRecebida, senhaEsperada)
  ) {
    return solicitarAutenticacao()
  }

  return NextResponse.next()
}

/**
 * Eu não preciso interceptar arquivos internos do Next nem o favicon.
 *
 * Páginas e rotas /api continuam protegidas.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
}
