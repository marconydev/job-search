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

  test("aceita vaga remota localizada em São Paulo", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Suporte",

      location: "São Paulo, SP, Brasil",

      remote: true
    })

    assert.equal(resultado.permitida, true)
  })

  test("aceita vaga remota localizada em Recife", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Sistemas",

      location: "Recife, PE, Brasil",

      remote: true
    })

    assert.equal(resultado.permitida, true)
  })

  test("aceita vaga presencial em João Pessoa", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Suporte",

      location: "João Pessoa, PB, Brasil",

      remote: false
    })

    assert.equal(resultado.permitida, true)
  })

  test("aceita vaga híbrida em João Pessoa quando normalizada como não remota", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Sistemas",

      location: "João Pessoa, PB",

      remote: false
    })

    assert.equal(resultado.permitida, true)
  })

  test("rejeita vaga presencial em São Paulo", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Suporte",

      location: "São Paulo, SP, Brasil",

      remote: false
    })

    assert.equal(resultado.permitida, false)

    assert.ok(resultado.motivo?.includes("fora de João Pessoa"))
  })

  test("rejeita vaga presencial em Governador Valadares", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Suporte",

      location: "Governador Valadares, Minas Gerais, Brasil",

      remote: false
    })

    assert.equal(resultado.permitida, false)
  })

  test("rejeita vaga não remota em Campina Grande", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Sistemas",

      location: "Campina Grande, PB, Brasil",

      remote: false
    })

    assert.equal(resultado.permitida, false)
  })

  test("rejeita vaga não remota informando apenas Paraíba", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Infraestrutura",

      location: "Paraíba",

      remote: false
    })

    assert.equal(resultado.permitida, false)
  })

  test("rejeita vaga não remota sem localização confirmada", () => {
    const resultado = avaliarPoliticaVagaBrasil({
      title: "Analista de Suporte",

      location: null,

      remote: false
    })

    assert.equal(resultado.permitida, false)
  })
})
