import "dotenv/config"

import { db } from "../database/connection.js"
import { syncJobs } from "../services/job-sync.js"

const DEFAULT_LIMIT = 100

async function run() {
  console.log("Iniciando sincronização de vagas...")

  try {
    const result = await syncJobs(DEFAULT_LIMIT)

    console.log("")
    console.log("Fontes")
    console.log("------")

    for (const source of result.sources) {
      console.log(`${source.source}:`)

      if (source.error) {
        console.log(`  Erro:       ${source.error}`)
        continue
      }

      console.log(`  Encontradas: ${source.found}`)
      console.log(`  Novas:       ${source.inserted}`)
      console.log(`  Duplicadas:  ${source.duplicates}`)
    }

    console.log("")
    console.log("Resumo")
    console.log("------")
    console.log(`Encontradas: ${result.totals.found}`)
    console.log(`Novas:       ${result.totals.inserted}`)
    console.log(`Duplicadas:  ${result.totals.duplicates}`)
    console.log(`Analisadas:  ${result.totals.analyzed}`)
    console.log(`Relevantes:  ${result.totals.relevant}`)
    console.log(`Descartadas: ${result.totals.discarded}`)
  } catch (error) {
    console.error("Falha durante a sincronização:", error)

    // Mantemos o código de erro para que uma automação futura consiga
    // identificar que a execução terminou com falha.
    process.exitCode = 1
  } finally {
    // Este processo é executado sob demanda e precisa encerrar o pool
    // antes de devolver o controle ao sistema operacional.
    await db.end()
  }
}

run()