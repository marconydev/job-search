import "dotenv/config"

import { identificarProvedorPagina } from "../discovery/page-classifier.js"

import { inspecionarPaginaVaga } from "../discovery/page-inspector.js"

import type { PaginaClassificada } from "../types/discovery.js"

/**
 * Uso este script para testar uma única página sem executar uma nova
 * descoberta e sem consumir chamadas da Brave Search.
 */
async function executar() {
  const url = process.argv[2]

  if (!url) {
    console.error("")
    console.error("Informe uma URL de vaga para testar.")
    console.error("")

    console.error('Exemplo: npx tsx src/scripts/test-page-inspector.ts "https://empresa.com/vaga"')

    process.exitCode = 1
    return
  }

  const provedor = identificarProvedorPagina(url)

  const pagina: PaginaClassificada = {
    origem: "teste-manual",
    consulta: "teste-manual",
    titulo: "Teste manual",
    url,
    descricao: null,
    provedor
  }

  console.log("")
  console.log("Inspecionando página...")
  console.log(`URL: ${url}`)
  console.log(`Origem identificada: ${provedor}`)
  console.log("")

  const resultado = await inspecionarPaginaVaga(pagina)

  if ("erro" in resultado) {
    console.error("Não consegui inspecionar a página.")

    console.error(`Erro: ${resultado.erro}`)

    process.exitCode = 1
    return
  }

  console.log(`Status HTTP: ${resultado.codigoStatus}`)

  console.log(`URL final: ${resultado.urlFinal}`)

  console.log(`Origem final: ${resultado.provedor}`)

  console.log(`Vaga encontrada: ${resultado.ehPublicacaoVaga ? "sim" : "não"}`)

  if (!resultado.vaga) {
    console.log("")
    console.log("A página foi acessada, mas não consegui extrair uma vaga válida.")
    return
  }

  const vaga = resultado.vaga

  console.log("")
  console.log("Dados extraídos")
  console.log("---------------")

  console.log(`Título: ${vaga.titulo ?? "não informado"}`)

  console.log(`Empresa: ${vaga.empresa ?? "não informada"}`)

  console.log(`Local: ${vaga.localizacao ?? "não informado"}`)

  console.log(`Remoto: ${vaga.remoto ? "sim" : "não"}`)

  console.log(`Contratação: ${vaga.tipoContratacao ?? "não informada"}`)

  console.log(`Publicada em: ${vaga.dataPublicacao ?? "não informado"}`)

  console.log(`Válida até: ${vaga.validaAte ?? "não informado"}`)

  console.log(`Candidatura: ${vaga.urlCandidatura ?? "não informada"}`)

  console.log("")
  console.log("Elegibilidade")
  console.log("-------------")

  console.log(`Brasil: ${resultado.elegibilidadeBrasil?.situacao ?? "não avaliada"}`)

  console.log(`Motivo: ${resultado.elegibilidadeBrasil?.motivo ?? "não informado"}`)

  if (vaga.descricao) {
    console.log("")
    console.log("Descrição")
    console.log("---------")

    console.log(vaga.descricao.length > 800 ? `${vaga.descricao.slice(0, 800)}...` : vaga.descricao)
  }
}

executar().catch(erro => {
  console.error("Falha inesperada durante o teste:", erro)

  process.exitCode = 1
})
