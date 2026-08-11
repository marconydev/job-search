import "dotenv/config"

import {
  db
} from "../database/connection.js"

import {
  processarVagasWeb
} from "../services/processamento-vagas-web.js"

import {
  analyzePendingJobs as analisarVagasPendentes
} from "../services/job-analysis.js"

/**
 * Executo o pipeline completo das vagas descobertas pela web.
 *
 * Gravo somente oportunidades confirmadas como compatíveis com o Brasil
 * e depois envio as novas vagas para a análise de compatibilidade.
 */
async function executar() {
  console.log("")
  console.log(
    "Iniciando sincronização das vagas encontradas na web..."
  )
  console.log("")

  try {
    const resultado =
      await processarVagasWeb({
        salvarCompativeis: true
      })

    const analise =
      await analisarVagasPendentes()

    console.log("")
    console.log("Resumo geral")
    console.log("------------")

    console.log(
      `Páginas descobertas:     ${resultado.paginasDescobertas}`
    )

    console.log(
      `Páginas selecionadas:    ${resultado.paginasSelecionadas}`
    )

    console.log(
      `Vagas extraídas:         ${resultado.vagasExtraidas}`
    )

    console.log(
      `Compatíveis com Brasil:  ${resultado.compativeisBrasil}`
    )

    console.log(
      `Fora do Brasil:          ${resultado.incompativeisBrasil}`
    )

    console.log(
      `Localização indefinida:  ${resultado.indefinidas}`
    )

    console.log(
      `Importadas:              ${resultado.importadas}`
    )

    console.log(
      `Duplicadas:              ${resultado.duplicadas}`
    )

    console.log(
      `Dados incompletos:       ${resultado.semDadosObrigatorios}`
    )

    console.log(
      `Falhas:                  ${resultado.falhas}`
    )

    console.log("")
    console.log("Matcher")
    console.log("-------")

    console.log(
      `Analisadas:   ${analise.analyzed}`
    )

    console.log(
      `Relevantes:   ${analise.relevant}`
    )

    console.log(
      `Descartadas:  ${analise.discarded}`
    )

    console.log("")
    console.log("Por plataforma")
    console.log("--------------")

    for (
      const fonte
      of resultado.porProvedor
    ) {
      console.log("")
      console.log(
        fonte.provedor.toUpperCase()
      )

      console.log(
        `  Encontradas:           ${fonte.encontradas}`
      )

      console.log(
        `  Vagas válidas:         ${fonte.vagasValidas}`
      )

      console.log(
        `  Brasil:                ${fonte.compativeisBrasil}`
      )

      console.log(
        `  Fora do Brasil:        ${fonte.incompativeisBrasil}`
      )

      console.log(
        `  Indefinidas:           ${fonte.indefinidas}`
      )

      console.log(
        `  Importadas:            ${fonte.importadas}`
      )

      console.log(
        `  Duplicadas:            ${fonte.duplicadas}`
      )

      console.log(
        `  Dados incompletos:     ${fonte.semDadosObrigatorios}`
      )

      console.log(
        `  Ignoradas:             ${fonte.ignoradas}`
      )

      console.log(
        `  Falhas:                ${fonte.falhas}`
      )
    }
  } catch (erro) {
    console.error(
      "Falha durante a sincronização das vagas:",
      erro
    )

    process.exitCode = 1
  } finally {
    // Encerro o pool porque este script é executado sob demanda
    // e não precisa manter uma conexão aberta após finalizar.
    await db.end()
  }
}

executar()