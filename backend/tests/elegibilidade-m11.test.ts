import assert from "node:assert/strict"
import test from "node:test"

import { avaliarElegibilidadeBrasil } from "../src/services/elegibilidade-localizacao.js"

test("M11: sem localizacoesAceitas, cidade fora da lista hardcoded nao e aceita", () => {
  const r = avaliarElegibilidadeBrasil("Vila Nova", null, null, false, [])
  assert.equal(r.situacao, "incompativel")
})

test("M11: localizacoesAceitas aceita cidade customizada", () => {
  const r = avaliarElegibilidadeBrasil("Vila Nova", null, null, false, ["vila nova"])
  assert.equal(r.situacao, "compativel")
  assert.match(r.motivo ?? "", /localizações aceitas/i)
})

test("M11: localizacoesAceitas nao inventa match quando location e null", () => {
  const r = avaliarElegibilidadeBrasil(null, null, null, false, ["vila nova"])
  assert.equal(r.situacao, "indefinida")
})

test("M11: Joao Pessoa continua aceito pela lista hardcoded", () => {
  const r = avaliarElegibilidadeBrasil("João Pessoa, PB", null, null, false, [])
  assert.equal(r.situacao, "compativel")
})

test("M11: Recife com modalidade desconhecida agora e incompativel (RMPJP estrita)", () => {
  const r = avaliarElegibilidadeBrasil("Recife, PE", null, null, false, [])
  assert.equal(r.situacao, "incompativel")
})

test("M11: Recife com workplaceType hybrid continua aceito", () => {
  const r = avaliarElegibilidadeBrasil("Recife, PE", null, null, false, [], "hybrid")
  assert.equal(r.situacao, "compativel")
})

test("M11: Campina Grande com modalidade desconhecida agora e incompativel (RMPJP estrita)", () => {
  const r = avaliarElegibilidadeBrasil("Campina Grande, PB", null, null, false, [])
  assert.equal(r.situacao, "incompativel")
})

test("M11: Campina Grande com workplaceType hybrid continua aceito", () => {
  const r = avaliarElegibilidadeBrasil("Campina Grande, PB", null, null, false, [], "hybrid")
  assert.equal(r.situacao, "compativel")
})

test("M11: exclusao explicita vence localizacoesAceitas", () => {
  const r = avaliarElegibilidadeBrasil(
    "Brasil",
    "This position is not available in Brazil.",
    null,
    false,
    ["brasil"]
  )
  assert.equal(r.situacao, "incompativel")
})

test("M11: exigencia de residencia no exterior vence localizacoesAceitas", () => {
  const r = avaliarElegibilidadeBrasil(
    "Brasil",
    "Candidates must be based in United States.",
    null,
    false,
    ["brasil"]
  )
  assert.equal(r.situacao, "incompativel")
})

test("M11: on-site nao e liberado por localizacoesAceitas genérica (brasil)", () => {
  const r = avaliarElegibilidadeBrasil("São Paulo, SP, Brasil", null, "Analista", false, ["brasil"], "on-site")
  assert.equal(r.situacao, "incompativel")
})

test("M11: on-site em Brasília nao e liberado por 'brasil' (sem substring bug)", () => {
  const r = avaliarElegibilidadeBrasil("Brasília, Distrito Federal", null, "Analista", false, ["brasil"], "on-site")
  assert.equal(r.situacao, "incompativel")
})

test("M11: hybrid em SP com localizacoesAceitas=['brasil'] continua compativel", () => {
  const r = avaliarElegibilidadeBrasil("São Paulo, SP, Brasil", null, "Analista", false, ["brasil"], "hybrid")
  assert.equal(r.situacao, "compativel")
})

test("M11: on-site em cidade customizada aceita explicitamente continua compativel", () => {
  const r = avaliarElegibilidadeBrasil("Vila Nova", null, "Analista", false, ["vila nova"], "on-site")
  assert.equal(r.situacao, "compativel")
})

