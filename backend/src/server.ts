import "dotenv/config"

import { timingSafeEqual } from "node:crypto"

import express from "express"

import type { NextFunction, Request, Response } from "express"

import { db } from "./database/connection.js"

import { jobsRouter } from "./routes/jobs.js"
import { perfilRouter } from "./routes/perfil.js"

const app = express()

const port = Number(process.env.PORT) || 3333

app.disable("x-powered-by")

app.use(
  express.json({
    limit: "2mb"
  })
)

/**
 * Eu comparo o token sem depender de uma comparação simples de strings.
 *
 * O tamanho precisa ser igual antes do timingSafeEqual porque a função
 * exige buffers com o mesmo comprimento.
 */
function tokensSaoIguais(recebido: string, esperado: string) {
  const bufferRecebido = Buffer.from(recebido)

  const bufferEsperado = Buffer.from(esperado)

  if (bufferRecebido.length !== bufferEsperado.length) {
    return false
  }

  return timingSafeEqual(bufferRecebido, bufferEsperado)
}

/**
 * O backend fica acessível pela internet depois do deploy no Render.
 *
 * Por isso eu não considero apenas o endereço público como proteção.
 * Todas as rotas da aplicação exigem um token compartilhado com o
 * servidor Next.
 *
 * Se o token não estiver configurado, a API falha fechada em vez de
 * liberar o acesso por engano.
 */
function exigirTokenApi(request: Request, response: Response, next: NextFunction) {
  const tokenEsperado = process.env.API_ACCESS_TOKEN?.trim()

  if (!tokenEsperado) {
    return response.status(503).json({
      message: "A API ainda não possui um token de acesso configurado."
    })
  }

  const autorizacao = request.header("authorization") ?? ""

  const prefixo = "Bearer "

  if (!autorizacao.startsWith(prefixo)) {
    return response.status(401).json({
      message: "Não autorizado."
    })
  }

  const tokenRecebido = autorizacao.slice(prefixo.length).trim()

  if (!tokenRecebido || !tokensSaoIguais(tokenRecebido, tokenEsperado)) {
    return response.status(401).json({
      message: "Não autorizado."
    })
  }

  return next()
}

/**
 * Health check utilizado pelo Render.
 *
 * Esta rota verifica apenas se o processo HTTP está vivo.
 *
 * Ela não consulta PostgreSQL porque uma lentidão temporária no banco
 * não deve fazer o Render considerar toda a aplicação indisponível e
 * reiniciar o processo durante uma sincronização.
 */
app.get("/health", (_request, response) => {
  return response.status(200).json({
    status: "ok"
  })
})

/**
 * Diagnóstico separado da conexão com o banco.
 *
 * Esta rota não deve ser utilizada como health check do Render.
 */
app.get("/health/database", async (_request, response) => {
  try {
    await db.query("SELECT 1")

    return response.status(200).json({
      status: "ok",
      database: "connected"
    })
  } catch (error) {
    console.error("Erro ao acessar o banco de dados:", error)

    return response.status(503).json({
      status: "error",
      database: "disconnected"
    })
  }
})

app.use("/jobs", exigirTokenApi, jobsRouter)

app.use("/perfil", exigirTokenApi, perfilRouter)

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`)
})
