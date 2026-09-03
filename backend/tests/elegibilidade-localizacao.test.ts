import assert from "node:assert/strict"

import { describe, test } from "node:test"

import { avaliarElegibilidadeBrasil } from "../src/services/elegibilidade-localizacao.js"

describe("elegibilidade de localização no Brasil", () => {
  test("aceita Brasil explicitamente", () => {
    const resultado = avaliarElegibilidadeBrasil("Brasil")

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita Brazil explicitamente", () => {
    const resultado = avaliarElegibilidadeBrasil("Brazil")

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita cidade e UF brasileiras", () => {
    const resultado = avaliarElegibilidadeBrasil("Blumenau, SC")

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita cidade da Paraíba", () => {
    const resultado = avaliarElegibilidadeBrasil("João Pessoa, PB")

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita vaga remota localizada no Brasil", () => {
    const resultado = avaliarElegibilidadeBrasil("Brazil - Remote", null, null, true)

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita vaga remota no Brasil informada em português", () => {
    const resultado = avaliarElegibilidadeBrasil("Brasil - Remoto", null, null, true)

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita UF brasileira presente no título", () => {
    const resultado = avaliarElegibilidadeBrasil(null, null, "Analista de Suporte - SP")

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita Worldwide quando a vaga foi confirmada como remota", () => {
    const resultado = avaliarElegibilidadeBrasil(
      "Worldwide",
      "Atuação totalmente remota.",
      "Analista de Suporte",
      true
    )

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita Anywhere quando a vaga foi confirmada como remota", () => {
    const resultado = avaliarElegibilidadeBrasil("Anywhere", null, "Analista de Sistemas", true)

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita LATAM quando a vaga foi confirmada como remota", () => {
    const resultado = avaliarElegibilidadeBrasil(
      "LATAM - Remote",
      null,
      "Analista de Suporte",
      true
    )

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita Latin America, South America e Americas para vaga remota", () => {
    const localizacoes = ["Latin America", "South America", "Americas"]

    for (const localizacao of localizacoes) {
      const resultado = avaliarElegibilidadeBrasil(localizacao, null, "Analista de Suporte", true)

      assert.equal(resultado.situacao, "compativel", localizacao)
    }
  })

  test("não usa região global para liberar vaga que não foi confirmada como remota", () => {
    const worldwide = avaliarElegibilidadeBrasil("Worldwide", null, "Analista de Suporte", false)

    const latam = avaliarElegibilidadeBrasil("LATAM", null, "Analista de Suporte", false)

    assert.equal(worldwide.situacao, "incompativel")

    assert.equal(latam.situacao, "incompativel")
  })

  test("rejeita regiões remotas que não incluem o Brasil", () => {
    const regioes = ["Europe - Remote", "EMEA", "APAC"]

    for (const localizacao of regioes) {
      const resultado = avaliarElegibilidadeBrasil(localizacao, null, "Analista de Suporte", true)

      assert.equal(resultado.situacao, "incompativel", localizacao)
    }
  })

  test("rejeita Worldwide quando a própria localização exclui o Brasil", () => {
    const resultado = avaliarElegibilidadeBrasil(
      "Worldwide except Brazil",
      null,
      "Analista de Suporte",
      true
    )

    assert.equal(resultado.situacao, "incompativel")
  })

  test("rejeita Lituânia mesmo sendo remota", () => {
    const resultado = avaliarElegibilidadeBrasil(
      "Lithuania - Remote",
      null,
      "Analista de Suporte",
      true
    )

    assert.equal(resultado.situacao, "incompativel")
  })

  test("rejeita Sérvia mesmo sendo remota", () => {
    const resultado = avaliarElegibilidadeBrasil(
      "Serbia - Remote",
      null,
      "Analista de Suporte",
      true
    )

    assert.equal(resultado.situacao, "incompativel")
  })

  test("rejeita Portugal", () => {
    const resultado = avaliarElegibilidadeBrasil("Lisboa, Portugal")

    assert.equal(resultado.situacao, "incompativel")
  })

  test("rejeita cidade estrangeira mesmo sem país conhecido", () => {
    const resultado = avaliarElegibilidadeBrasil("Hyderabad")

    assert.equal(resultado.situacao, "incompativel")
  })

  test("rejeita localização estrangeira da Grécia", () => {
    const resultado = avaliarElegibilidadeBrasil("Thessaloniki, Greece")

    assert.equal(resultado.situacao, "incompativel")
  })

  test("rejeita localização US", () => {
    const resultado = avaliarElegibilidadeBrasil("US")

    assert.equal(resultado.situacao, "incompativel")
  })

  test("não interpreta a preposição am de Frankfurt am Main como Amazonas", () => {
    const resultado = avaliarElegibilidadeBrasil(
      "Frankfurt am Main",
      null,
      "IT-Support Mitarbeiter (m/w/d) auf Minijob-Basis"
    )

    assert.equal(resultado.situacao, "incompativel")
  })

  test("mantém apenas Remote como localização indefinida", () => {
    const resultado = avaliarElegibilidadeBrasil("Remote", null, "Analista de Suporte", true)

    assert.equal(resultado.situacao, "indefinida")
  })

  test("mantém apenas Remoto como localização indefinida", () => {
    const resultado = avaliarElegibilidadeBrasil("Remoto", null, "Analista de Suporte", true)

    assert.equal(resultado.situacao, "indefinida")
  })

  test("mantém vaga sem localização como indefinida", () => {
    const resultado = avaliarElegibilidadeBrasil(null)

    assert.equal(resultado.situacao, "indefinida")
  })

  test("aceita descrição que informa explicitamente Remote Brazil", () => {
    const resultado = avaliarElegibilidadeBrasil(
      null,
      "Work location: Brazil - Remote",
      "Analista de Suporte",
      true
    )

    assert.equal(resultado.situacao, "compativel")
  })

  test("aceita descrição que informa vaga remota no Brasil", () => {
    const resultado = avaliarElegibilidadeBrasil(
      null,
      "Vaga remota no Brasil para atuação com suporte técnico.",
      "Analista de Suporte",
      true
    )

    assert.equal(resultado.situacao, "compativel")
  })

  test("rejeita descrição que exclui explicitamente o Brasil", () => {
    const resultado = avaliarElegibilidadeBrasil(
      "Worldwide",
      "This position is available worldwide except Brazil.",
      "Analista de Suporte",
      true
    )

    assert.equal(resultado.situacao, "incompativel")
  })

  test("rejeita descrição que exige residência nos Estados Unidos", () => {
    const resultado = avaliarElegibilidadeBrasil(
      "Worldwide",
      "Candidates must be based in United States.",
      "Analista de Suporte",
      true
    )

    assert.equal(resultado.situacao, "incompativel")
  })
})
