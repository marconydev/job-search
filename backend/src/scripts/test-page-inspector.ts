import "dotenv/config"

import {
  identificarProvedorPagina
} from "../discovery/page-classifier.js"

import {
  inspecionarPaginaVaga
} from "../discovery/page-inspector.js"

import type {
  PaginaClassificada
} from "../types/discovery.js"

/**
 * Uso este script para testar uma única página antes de conectar
 * o inspetor ao fluxo completo de descoberta.
 *
 * Recebo a URL pelo terminal para conseguir testar plataformas
 * diferentes sem precisar modificar o código.
 */
async function executar() {
  const url = process.argv[2]

  if (!url) {
    console.error("")
    console.error(
      "Informe uma URL de vaga para testar."
    )
    console.error("")
    console.error(
      'Exemplo: npx tsx src/scripts/test-page-inspector.ts "https://empresa.com/vaga"'
    )

    process.exitCode = 1
    return
  }

  const provedor =
    identificarProvedorPagina(url)

  const pagina: PaginaClassificada = {
    source: "manual-test",
    query: "manual-test",
    title: "Teste manual",
    url,
    description: null,
    provider: provedor
  }

  console.log("")
  console.log("Inspecionando página...")
  console.log(`URL: ${url}`)
  console.log(
    `Origem identificada: ${provedor}`
  )
  console.log("")

  const resultado =
    await inspecionarPaginaVaga(pagina)

  // Trato falha de acesso separadamente de uma página que foi
  // acessada normalmente mas não apresentou uma vaga reconhecível.
  if ("erro" in resultado) {
    console.error(
      "Não consegui inspecionar a página."
    )
    console.error(
      `Erro: ${resultado.erro}`
    )

    process.exitCode = 1
    return
  }

  console.log(
    `Status HTTP: ${resultado.codigoStatus}`
  )

  console.log(
    `URL final: ${resultado.urlFinal}`
  )

  console.log(
    `Origem final: ${resultado.provedor}`
  )

  console.log(
    `Vaga encontrada: ${
      resultado.ehPublicacaoVaga
        ? "sim"
        : "não"
    }`
  )

  if (!resultado.vaga) {
    console.log("")
    console.log(
      "A página foi acessada, mas não consegui extrair uma vaga válida."
    )
    return
  }

  const vaga = resultado.vaga

  console.log("")
  console.log("Dados extraídos")
  console.log("---------------")

  console.log(
    `Título: ${vaga.titulo ?? "não informado"}`
  )

  console.log(
    `Empresa: ${vaga.empresa ?? "não informada"}`
  )

  console.log(
    `Local: ${vaga.localizacao ?? "não informado"}`
  )

  console.log(
    `Remoto: ${vaga.remoto ? "sim" : "não"}`
  )

  console.log(
    `Contratação: ${
      vaga.tipoContratacao ??
      "não informada"
    }`
  )

  console.log(
    `Publicada em: ${
      vaga.dataPublicacao ??
      "não informado"
    }`
  )

  console.log(
    `Válida até: ${
      vaga.validaAte ??
      "não informado"
    }`
  )

  console.log(
    `Candidatura: ${
      vaga.urlCandidatura ??
      "não informada"
    }`
  )

  if (vaga.descricao) {
    console.log("")
    console.log("Descrição")
    console.log("---------")

    // Mostro somente uma parte para manter o teste legível no terminal.
    console.log(
      vaga.descricao.length > 800
        ? `${vaga.descricao.slice(0, 800)}...`
        : vaga.descricao
    )
  }
}

executar().catch((erro) => {
  console.error(
    "Falha inesperada durante o teste:",
    erro
  )

  process.exitCode = 1
})