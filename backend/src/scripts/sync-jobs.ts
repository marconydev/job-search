import "dotenv/config"

import {
  db
} from "../database/connection.js"

import {
  syncJobs
} from "../services/job-sync.js"

const LIMITE_PADRAO = 100

async function executar() {
  console.log("")
  console.log(
    "Iniciando Job Search..."
  )

  console.log(
    "Brave protegida por limite diário de 6 chamadas."
  )

  try {
    const resultado =
      await syncJobs(
        LIMITE_PADRAO
      )

    console.log("")
    console.log(
      "Fontes diretas"
    )

    console.log(
      "-------------"
    )

    for (
      const fonte
      of resultado.fontes
    ) {
      console.log("")

      console.log(
        fonte.source
      )

      if (
        fonte.error
      ) {
        console.log(
          `Erro: ${fonte.error}`
        )

        continue
      }

      console.log(
        `Encontradas: ${fonte.found}`
      )

      console.log(
        `Novas:       ${fonte.inserted}`
      )

      console.log(
        `Duplicadas:  ${fonte.duplicates}`
      )
    }

    console.log("")
    console.log(
      "Descoberta web"
    )

    console.log(
      "-------------"
    )

    console.log(
      `Páginas disponíveis:    ${resultado.web.paginasDescobertas}`
    )

    console.log(
      `Vagas extraídas:        ${resultado.web.vagasExtraidas}`
    )

    console.log(
      `Compatíveis Brasil:     ${resultado.web.compativeisBrasil}`
    )

    console.log(
      `Importadas:             ${resultado.web.importadas}`
    )

    console.log(
      `Duplicadas:             ${resultado.web.duplicadas}`
    )

    console.log(
      `Recomendações extras:   ${resultado.web.recomendacoesDescoberta.length}`
    )

    console.log("")
    console.log(
      "Melhores descobertas"
    )

    console.log(
      "-------------------"
    )

    for (
      const vaga
      of resultado.web
        .recomendacoesDescoberta
        .slice(
          0,
          15
        )
    ) {
      console.log("")

      console.log(
        `[${vaga.pontuacao}%] ${vaga.titulo}`
      )

      console.log(
        `Origem: ${vaga.provedor}`
      )

      console.log(
        vaga.url
      )
    }

    console.log("")
    console.log("Matcher")
    console.log("-------")

    console.log(
      `Analisadas:  ${resultado.analise.analisadas}`
    )

    console.log(
      `Relevantes:  ${resultado.analise.relevantes}`
    )

    console.log(
      `Descartadas: ${resultado.analise.descartadas}`
    )
  } catch (erro) {
    console.error(
      "Falha durante a sincronização:",
      erro
    )

    process.exitCode = 1
  } finally {
    await db.end()
  }
}

executar()