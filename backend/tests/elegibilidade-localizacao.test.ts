import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { avaliarElegibilidadeBrasil } from "../src/services/elegibilidade-localizacao.js"

describe("elegibilidade de localização no Brasil", () => {
  test("aceita Brasil explicitamente", () => {
    assert.equal(avaliarElegibilidadeBrasil("Brasil").situacao, "compativel")
  })
  test("aceita Brazil explicitamente", () => {
    assert.equal(avaliarElegibilidadeBrasil("Brazil").situacao, "compativel")
  })
  test("rejeita cidade brasileira específica fora da RMPJP quando modalidade é desconhecida", () => {
    assert.equal(avaliarElegibilidadeBrasil("Blumenau, SC").situacao, "incompativel")
  })
  test("aceita cidade da Paraíba", () => {
    assert.equal(avaliarElegibilidadeBrasil("João Pessoa, PB").situacao, "compativel")
  })
  test("aceita vaga remota localizada no Brasil", () => {
    assert.equal(avaliarElegibilidadeBrasil("Brazil - Remote", null, null, true).situacao, "compativel")
  })
  test("aceita vaga remota no Brasil informada em português", () => {
    assert.equal(avaliarElegibilidadeBrasil("Brasil - Remoto", null, null, true).situacao, "compativel")
  })
  test("aceita UF brasileira presente no título", () => {
    assert.equal(avaliarElegibilidadeBrasil(null, null, "Analista de Suporte - SP").situacao, "compativel")
  })
  test("aceita Worldwide (Tech Lead)", () => {
    assert.equal(avaliarElegibilidadeBrasil("Worldwide", null, null, true).situacao, "compativel")
  })
  test("aceita Anywhere (Tech Lead)", () => {
    assert.equal(avaliarElegibilidadeBrasil("Anywhere", null, null, true).situacao, "compativel")
  })
  test("aceita LATAM (Tech Lead)", () => {
    assert.equal(avaliarElegibilidadeBrasil("LATAM", null, null, true).situacao, "compativel")
  })
  test("aceita regiões amplas (Tech Lead)", () => {
    assert.equal(avaliarElegibilidadeBrasil("South America", null, null, true).situacao, "compativel")
  })
  test("rejeita Worldwide para vaga não remota", () => {
    assert.equal(avaliarElegibilidadeBrasil("Worldwide", null, null, false).situacao, "incompativel")
  })
  test("rejeita regiões remotas que não incluem o Brasil", () => {
    assert.equal(avaliarElegibilidadeBrasil("Europe - Remote", null, null, true).situacao, "incompativel")
  })
  test("rejeita Worldwide quando a própria localização exclui o Brasil", () => {
    assert.equal(avaliarElegibilidadeBrasil("Worldwide except Brazil", null, null, true).situacao, "incompativel")
  })
  test("rejeita Lituânia mesmo sendo remota", () => {
    assert.equal(avaliarElegibilidadeBrasil("Lithuania - Remote", null, null, true).situacao, "incompativel")
  })
  test("rejeita Sérvia mesmo sendo remota", () => {
    assert.equal(avaliarElegibilidadeBrasil("Serbia - Remote", null, null, true).situacao, "incompativel")
  })
  test("rejeita Portugal", () => {
    assert.equal(avaliarElegibilidadeBrasil("Lisboa, Portugal").situacao, "incompativel")
  })
  test("rejeita cidade estrangeira", () => {
    assert.equal(avaliarElegibilidadeBrasil("Hyderabad").situacao, "incompativel")
  })
  test("rejeita Grécia", () => {
    assert.equal(avaliarElegibilidadeBrasil("Thessaloniki, Greece").situacao, "incompativel")
  })
  test("rejeita US", () => {
    assert.equal(avaliarElegibilidadeBrasil("US").situacao, "incompativel")
  })
  test("mantém apenas Remote como indefinida", () => {
    assert.equal(avaliarElegibilidadeBrasil("Remote", null, null, true).situacao, "indefinida")
  })
  test("aceita descrição informando Remote Brazil", () => {
    assert.equal(avaliarElegibilidadeBrasil(null, "Work location: Brazil - Remote", null, true).situacao, "compativel")
  })
})