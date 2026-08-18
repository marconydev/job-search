import assert from "node:assert/strict"

import { describe, test } from "node:test"

import { gerarConsultasBuscaVagas } from "../src/config/search-queries.js"

import type { PerfilProfissional } from "../src/types/perfil-profissional.js"

function criarPerfil(): PerfilProfissional {
  return {
    resumoProfissional: "",

    cargosPrincipais: [
      "Analista de Suporte",
      "Technical Support",
      "Analista de Sistemas",
      "Application Support",
      "Analista de Infraestrutura",
      "NOC Analyst",
      "Analista de Implantação"
    ],

    cargosRelacionados: ["Customer Onboarding", "Analista de Dados", "BI Analyst"],

    cargosDesvio: ["Software Developer"],

    competencias: [],

    experiencias: [],

    formacoes: [],

    cursos: [],

    localizacoesAceitas: ["Brasil", "Brazil"],

    titulosExcluidos: []
  }
}

describe("gerador de consultas de vagas", () => {
  test("gera pesquisas diárias em várias plataformas", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const diarias = consultas.filter(consulta => consulta.recorrencia === "diaria")

    assert.ok(diarias.length >= 22)

    assert.ok(diarias.some(consulta => consulta.plataforma === "gupy"))

    assert.ok(diarias.some(consulta => consulta.plataforma === "linkedin"))

    assert.ok(diarias.some(consulta => consulta.plataforma === "indeed"))
  })

  test("prioriza bancos fintechs e empresas de tecnologia", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const estrategicas = consultas.filter(consulta => consulta.familia === "empresas")

    assert.equal(estrategicas.length, 3)

    const texto = estrategicas.map(consulta => consulta.texto.toLowerCase()).join("\n")

    const empresasEsperadas = [
      "itaú",
      "bradesco",
      "safra",
      "sicredi",
      "nubank",
      "neon",
      "mercado livre",
      "mercado pago",
      "picpay",
      "inter",
      "pagbank",
      "stone",
      "c6 bank",
      "totvs",
      "accenture",
      "senior sistemas",
      "softplan",
      "tivit",
      "matera",
      "serasa experian"
    ]

    for (const empresa of empresasEsperadas) {
      assert.ok(texto.includes(empresa), `Empresa estratégica ausente: ${empresa}`)
    }
  })

  test("prioriza sudeste sul e centro oeste sem remover a busca nacional", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const regionais = consultas.filter(consulta => consulta.familia === "regional")

    assert.equal(regionais.length, 3)

    assert.ok(regionais.some(consulta => consulta.plataforma === "regiao-sudeste"))

    assert.ok(regionais.some(consulta => consulta.plataforma === "regiao-sul"))

    assert.ok(regionais.some(consulta => consulta.plataforma === "regiao-centro-oeste"))

    const texto = regionais.map(consulta => consulta.texto.toLowerCase()).join("\n")

    assert.ok(texto.includes("são paulo"))

    assert.ok(texto.includes("blumenau"))

    assert.ok(texto.includes("brasília"))

    /**
     * A consulta web geral continua existindo, portanto a prioridade
     * regional não transforma a busca em uma busca apenas local.
     */
    assert.ok(
      consultas.some(consulta => consulta.plataforma === "web" && consulta.texto.includes("Brasil"))
    )
  })

  test("inclui todos os cargos buscados em alguma consulta", () => {
    const perfil = criarPerfil()

    const consultas = gerarConsultasBuscaVagas(perfil)

    const texto = consultas.map(consulta => consulta.texto.toLowerCase()).join("\n")

    for (const cargo of [...perfil.cargosPrincipais, ...perfil.cargosRelacionados]) {
      assert.ok(texto.includes(`"${cargo.toLowerCase()}"`), `Cargo ausente das consultas: ${cargo}`)
    }
  })

  test("não usa cargos de desvio como estratégia de descoberta", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const texto = consultas.map(consulta => consulta.texto.toLowerCase()).join("\n")

    assert.equal(texto.includes('"software developer"'), false)
  })

  test("não gera consultas duplicadas", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const unicas = new Set(consultas.map(consulta => consulta.texto))

    assert.equal(unicas.size, consultas.length)
  })

  test("mantém as consultas dentro de tamanho seguro", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    for (const consulta of consultas) {
      assert.ok(consulta.texto.length <= 400, `Consulta longa demais: ${consulta.texto}`)

      const palavras = consulta.texto.trim().split(/\s+/).length

      assert.ok(palavras <= 50, `Consulta com palavras demais: ${consulta.texto}`)
    }
  })
})
