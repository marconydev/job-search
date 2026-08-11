import "dotenv/config"

import { db } from "../database/connection.js"
import { syncJobs } from "../services/job-sync.js"

const DEFAULT_LIMIT = 100

async function run() {
  console.log("Iniciando sincronização de vagas...")

  try {
    const result = await syncJobs(DEFAULT_LIMIT)

    console.log("")
    console.log("Sincronização concluída")
    console.log("-----------------------")
    console.log(`Fonte:       ${result.source}`)
    console.log(`Encontradas: ${result.found}`)
    console.log(`Novas:       ${result.inserted}`)
    console.log(`Duplicadas:  ${result.duplicates}`)
    console.log(`Analisadas:  ${result.analyzed}`)
    console.log(`Relevantes:  ${result.relevant}`)
    console.log(`Descartadas: ${result.discarded}`)
  } catch (error) {
    console.error("Falha durante a sincronização:", error)

    // Define o código de saída sem interromper o finally.
    // Isso permite fechar corretamente a conexão com o PostgreSQL.
    process.exitCode = 1
  } finally {
    // Diferente da API, este script precisa terminar depois da execução.
    // Sem encerrar o pool, o Node pode continuar aberto aguardando conexões.
    await db.end()
  }
}

run()