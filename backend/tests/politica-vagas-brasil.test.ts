import assert from "node:assert/strict"

import { describe, test } from "node:test"

import {
  avaliarPoliticaVagaBrasil,
  tituloEstaNoFocoBrasil
} from "../src/services/politica-vagas-brasil.js"

describe("política de vagas focada no Brasil", () => {
  test("aceita título brasileiro de suporte", () => {
    assert.equal(tituloEstaNoFocoBrasil("Analista de Suporte"), true)
  })

  test("aceita título brasileiro contendo termo técnico em inglês", () => {
    assert.equal(tituloEstaNoFocoBrasil("Analista de Service Desk"), true)
  })

  test("aceita Analista NOC", () => {
    assert.equal(tituloEstaNoFocoBrasil("Analista NOC"), true)
  })

  test("aceita Analista de Power BI", () => {
    assert.equal(tituloEstaNoFocoBrasil("Analista de Power BI"), true)
  })

  test("rejeita IT Support Engineer", () => {
    assert.equal(tituloEstaNoFocoBrasil("IT Support Engineer"), false)
  })

  test("rejeita Technical Support Specialist", () => {
    assert.equal(tituloEstaNoFocoBrasil("Technical Support Specialist"), false)
  })

  test("rejeita Software Developer com Technical Support Specialist", () => {
    assert.equal(
      tituloEstaNoFocoBrasil("Software Developer I (Technical Support Specialist I)"),
      false
    )
  })

  test("rejeita vaga híbrida em São Paulo", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Suporte",

      location: "São Paulo, SP",

      description: "Modelo híbrido com três dias presenciais."
    })

    assert.equal(resultado.permitida, false)

    assert.ok(resultado.motivo?.includes("híbrida fora da Paraíba"))
  })

  test("rejeita vaga híbrida em Recife", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Sistemas",

      location: "Recife, PE",

      description: "Regime híbrido com comparecimento ao escritório."
    })

    assert.equal(resultado.permitida, false)
  })

  test("aceita vaga híbrida em João Pessoa", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Suporte",

      location: "João Pessoa, PB",

      description: "Modelo híbrido."
    })

    assert.equal(resultado.permitida, true)
  })

  test("aceita vaga híbrida em Campina Grande", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Sistemas",

      location: "Campina Grande, PB",

      description: "Modalidade híbrida."
    })

    assert.equal(resultado.permitida, true)
  })

  test("aceita híbrida quando Paraíba aparece explicitamente", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Infraestrutura",

      location: "Paraíba",

      description: "Trabalho híbrido."
    })

    assert.equal(resultado.permitida, true)
  })

  test("rejeita híbrida sem localização PB confirmada", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Suporte",

      location: null,

      description: "Modelo híbrido com dois dias presenciais."
    })

    assert.equal(resultado.permitida, false)
  })

  test("não bloqueia vaga remota brasileira por ser remota", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Suporte",

      location: "Brasil",

      description: "Trabalho 100% remoto."
    })

    assert.equal(resultado.permitida, true)
  })

  test("não bloqueia vaga presencial brasileira fora da Paraíba", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Suporte",

      location: "São Paulo, SP",

      description: "Atuação presencial no escritório."
    })

    assert.equal(resultado.permitida, true)
  })
})
