import "dotenv/config"

import { discoverJobPages } from "../services/job-discovery.js"

/**
 * Executa a descoberta de possíveis páginas de vagas pela internet.
 *
 * Neste momento os resultados ainda não são gravados como vagas.
 * Primeiro precisamos identificar que tipo de página foi encontrada
 * e confirmar se ela realmente representa uma oportunidade válida.
 */
async function run() {
  console.log("Buscando páginas de vagas na web...")

  try {
    const pages = await discoverJobPages()

    console.log("")
    console.log(`Páginas encontradas: ${pages.length}`)
    console.log("")

    for (const page of pages) {
      console.log(page.title)
      console.log(page.url)
      console.log(`Busca: ${page.query}`)
      console.log("----------------------------------------")
    }
  } catch (error) {
    console.error("Falha durante a busca na web:", error)

    // O código de saída será útil quando essa execução passar
    // a ser chamada automaticamente por um agendador.
    process.exitCode = 1
  }
}

run()