import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { avaliarElegibilidadeBrasil } from "../src/services/elegibilidade-localizacao.js"

describe("trava geográfica (diretiva v2)", () => {
  test("PRESENCIAL - São Paulo, SP deve ser INCOMPATÍVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("São Paulo, SP", null, null, false, [], "on-site").situacao, "incompativel")
  })
  test("PRESENCIAL - João Pessoa, PB deve ser COMPATÍVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("João Pessoa, PB", null, null, false, [], "on-site").situacao, "compativel")
  })
  test("PRESENCIAL - Campina Grande, PB deve ser INCOMPATÍVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("Campina Grande, PB", null, null, false, [], "on-site").situacao, "incompativel")
  })
  test("PRESENCIAL - Cabedelo (RMPJP) deve ser COMPATÍVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("Cabedelo, PB", null, null, false, [], "on-site").situacao, "compativel")
  })
  test("HÍBRIDO - Recife, PE deve ser COMPATÍVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("Recife, PE", null, null, false, [], "hybrid").situacao, "compativel")
  })
  test("HÍBRIDO - Lisbon, Portugal deve ser INCOMPATÍVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("Lisbon, Portugal", null, null, false, [], "hybrid").situacao, "incompativel")
  })
  test("REMOTO - Lisbon, Portugal deve ser INCOMPATÍVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("Lisbon, Portugal", null, null, true, [], "remote").situacao, "incompativel")
  })
  test("REMOTO - LATAM deve ser COMPATÍVEL (Tech Lead)", () => {
    assert.equal(avaliarElegibilidadeBrasil("LATAM", null, null, true, [], "remote").situacao, "compativel")
  })
  test("REMOTO - Global deve ser COMPATÍVEL (Tech Lead)", () => {
    assert.equal(avaliarElegibilidadeBrasil("Global", null, null, true, [], "remote").situacao, "compativel")
  })
  test("REMOTO - Worldwide deve ser COMPATÍVEL (Tech Lead)", () => {
    assert.equal(avaliarElegibilidadeBrasil("Worldwide", null, null, true, [], "remote").situacao, "compativel")
  })
  test("REMOTO - US (Remote) deve ser INCOMPATÍVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("US (Remote)", null, null, true, [], "remote").situacao, "incompativel")
  })
  test("REMOTO - Serbia | Global deve ser COMPATÍVEL (Tech Lead)", () => {
    assert.equal(avaliarElegibilidadeBrasil("Serbia | Global", null, null, true, [], "remote").situacao, "compativel")
  })
  test("REMOTO - Estonia | Global deve ser COMPATÍVEL (Tech Lead)", () => {
    assert.equal(avaliarElegibilidadeBrasil("Estonia | Global", null, null, true, [], "remote").situacao, "compativel")
  })
  test("REMOTO - EMEA deve ser INCOMPATÍVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("EMEA", null, null, true, [], "remote").situacao, "incompativel")
  })
  test("REMOTO - Brasil deve ser COMPATÍVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("Brasil", null, null, true, [], "remote").situacao, "compativel")
  })
})

describe("matriz de 4 pontos da diretiva (Tech Lead)", () => {
  test("Regra 3: vaga de outro pais (remota) com Global -> APROVADO", () => {
    assert.equal(avaliarElegibilidadeBrasil("Global", null, null, true, [], "remote").situacao, "compativel")
    assert.equal(avaliarElegibilidadeBrasil("LATAM", null, null, true, [], "remote").situacao, "compativel")
    assert.equal(avaliarElegibilidadeBrasil("Worldwide", null, null, true, [], "remote").situacao, "compativel")
  })
  test("Regra 3: vaga de outro pais (presencial/hibrida) -> BLOQUEIO", () => {
    assert.equal(avaliarElegibilidadeBrasil("London", null, null, false, [], "hybrid").situacao, "incompativel")
    assert.equal(avaliarElegibilidadeBrasil("New York, NY", null, null, false, [], "on-site").situacao, "incompativel")
  })
})

describe("Opcao 2 - bandeira estrangeira vence localizacoesAceitas", () => {
  const perfilAmplo = ["worldwide", "global", "latam", "americas"]
  test("Serbia | Global com perfil global é COMPATIVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("Serbia | Global", null, null, true, perfilAmplo, "remote").situacao, "compativel")
  })
  test("Global puro com perfil global é COMPATIVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("Global", null, null, true, perfilAmplo, "remote").situacao, "compativel")
  })
  test("Worldwide com perfil global é COMPATIVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("Worldwide", null, null, true, perfilAmplo, "remote").situacao, "compativel")
  })
  test("LATAM com perfil global é COMPATIVEL", () => {
    assert.equal(avaliarElegibilidadeBrasil("LATAM", null, null, true, perfilAmplo, "remote").situacao, "compativel")
  })
})