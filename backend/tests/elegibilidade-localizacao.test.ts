import assert from "node:assert/strict"

import { describe, test } from "node:test"

import { avaliarElegibilidadeBrasil } from "../src/services/elegibilidade-localizacao.js"

describe("elegibilidade de localização no Brasil", () => {
  test("aceita Brasil explicitamente", () => {
    const resultado = avaliarElegibilidadeBrasil("Brazil")

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita cidade e UF brasileiras", () => {
    const resultado = avaliarElegibilidadeBrasil("Blumenau, SC")

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita vaga remota localizada no Brasil", () => {
    const resultado = avaliarElegibilidadeBrasil("Brazil - Remote")

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita UF brasileira presente no título", () => {
    const resultado = avaliarElegibilidadeBrasil(null, null, "Analista de Suporte - SP")

    assert.equal(resultado.situacao, "compativel")
  })

  test("rejeita Lituânia mesmo sendo remota", () => {
    const resultado = avaliarElegibilidadeBrasil("Lithuania - Remote")

    assert.equal(resultado.situacao, "incompativel")
  })

  test("rejeita Sérvia mesmo sendo remota", () => {
    const resultado = avaliarElegibilidadeBrasil("Serbia - Remote")

    assert.equal(resultado.situacao, "incompativel")
  })

  test("não interpreta a preposição am de Frankfurt am Main como Amazonas", () => {
    const resultado = avaliarElegibilidadeBrasil(
      "Frankfurt am Main",
      null,
      "IT-Support Mitarbeiter (m/w/d) auf Minijob-Basis"
    )

    assert.notEqual(resultado.situacao, "compativel")
  })

  test("mantém vaga global como indefinida quando não exclui Brasil", () => {
    const resultado = avaliarElegibilidadeBrasil("Worldwide")

    assert.equal(resultado.situacao, "indefinida")
  })

  test("mantém LATAM como indefinida quando Brasil não é excluído", () => {
    const resultado = avaliarElegibilidadeBrasil("LATAM - Remote")

    assert.equal(resultado.situacao, "indefinida")
  })

  test("não aceita apenas Remote", () => {
    const resultado = avaliarElegibilidadeBrasil("Remote")

    assert.equal(resultado.situacao, "indefinida")
  })

  test("não aceita vaga sem localização comprovada", () => {
    const resultado = avaliarElegibilidadeBrasil(null)

    assert.equal(resultado.situacao, "indefinida")
  })

  test("aceita descrição que informa explicitamente Remote Brazil", () => {
    const resultado = avaliarElegibilidadeBrasil(
      null,
      "Work location: Brazil - Remote",
      "Technical Support Analyst"
    )

    assert.equal(resultado.situacao, "compativel")
  })
})
