import "dotenv/config"

import express from "express"

import { db } from "./database/connection.js"

import { jobsRouter } from "./routes/jobs.js"
import { perfilRouter } from "./routes/perfil.js"

const app = express()

const port = Number(process.env.PORT) || 3333

app.use(
  express.json({
    limit: "2mb"
  })
)

app.get("/health", async (_request, response) => {
  try {
    await db.query("SELECT 1")

    return response.status(200).json({
      status: "ok",
      database: "connected"
    })
  } catch (error) {
    console.error("Erro ao acessar o banco de dados:", error)

    return response.status(500).json({
      status: "error",
      database: "disconnected"
    })
  }
})

app.use("/jobs", jobsRouter)
app.use("/perfil", perfilRouter)

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`)
})
