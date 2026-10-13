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

test("UK explicito em 'Remote (UK)' bloqueia a vaga", () => {
  const r = avaliarElegibilidadeBrasil("Remote (UK)", null, "Support", true, [], "remote")
  assert.equal(r.situacao, "incompativel")
})

test("'Remote (GB)' bloqueia a vaga", () => {
  const r = avaliarElegibilidadeBrasil("Remote (GB)", null, "Support", true, [], "remote")
  assert.equal(r.situacao, "incompativel")
})

test("location=null + 'Brasilia, DF, BR' na descricao e compativel", () => {
  const r = avaliarElegibilidadeBrasil(
    null,
    "Analista de Suporte Tecnico - Brasilia, DF, BR (1 Vaga)",
    "Analista de Suporte Tecnico",
    false,
    [],
    "unknown"
  )
  assert.equal(r.situacao, "compativel")
})

test("location=null + 'Not available in Brazil' continua incompativel", () => {
  const r = avaliarElegibilidadeBrasil(
    null,
    "Analista de Suporte. This position is not available in Brazil.",
    "Analista de Suporte",
    false,
    [],
    "unknown"
  )
  assert.equal(r.situacao, "incompativel")
})

test("location=null sem sinal BR continua indefinida", () => {
  const r = avaliarElegibilidadeBrasil(
    null,
    "Generic support role with global teams.",
    "Technical Support",
    false,
    [],
    "unknown"
  )
  assert.equal(r.situacao, "indefinida")
})

test("'para' sozinho em descricao nao e confundido com o estado Para", () => {
  const r = avaliarElegibilidadeBrasil(
    null,
    "Vaga para analista de suporte com foco em atendimento.",
    "Analista de Suporte",
    false,
    [],
    "unknown"
  )
  // Nao deve ser compativel por falsa deteccao de "para" (estado).
  // Espera indefinida (sem outro sinal BR).
  assert.equal(r.situacao, "indefinida")
})

