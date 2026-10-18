import assert from "node:assert/strict"
import test from "node:test"

import { avaliarElegibilidadeBrasil } from "../src/services/elegibilidade-localizacao.js"

test("P1 titulo vaga exclusiva PCD", () => {
  const r = avaliarElegibilidadeBrasil("Joao Pessoa, PB", null, "Analista - Vaga exclusiva PCD", false)
  assert.equal(r.situacao, "incompativel")
})

test("P2 titulo vaga afirmativa PCD", () => {
  const r = avaliarElegibilidadeBrasil("Joao Pessoa, PB", null, "Vaga afirmativa PCD - Analista", false)
  assert.equal(r.situacao, "incompativel")
})

test("P3 titulo vaga PCD padrao explicito", () => {
  const r = avaliarElegibilidadeBrasil("Joao Pessoa, PB", null, "Analista - Vaga PCD", false)
  assert.equal(r.situacao, "incompativel")
})

test("P4 descricao vaga afirmativa para pessoas com deficiencia", () => {
  const r = avaliarElegibilidadeBrasil("Joao Pessoa, PB", "Vaga afirmativa para pessoas com deficiencia. Requisitos: suporte.", "Analista de Suporte", false)
  assert.equal(r.situacao, "incompativel")
})

test("P5 descricao vaga exclusiva para PCD", () => {
  const r = avaliarElegibilidadeBrasil("Joao Pessoa, PB", "Vaga exclusiva para PCD. Requisitos: SQL.", "Analista de Suporte", false)
  assert.equal(r.situacao, "incompativel")
})

test("P6 descricao apenas PCD", () => {
  const r = avaliarElegibilidadeBrasil("Joao Pessoa, PB", "Vaga apenas PCD. Requisitos: suporte.", "Analista de Suporte", false)
  assert.equal(r.situacao, "incompativel")
})

test("N1 diversidade e incentivo a PCD passa", () => {
  const r = avaliarElegibilidadeBrasil("Joao Pessoa, PB", "Empresa que valoriza a diversidade e incentiva PCD a se candidatar.", "Analista de Suporte", false)
  assert.equal(r.situacao, "compativel")
})

test("N2 vaga afirmativa para mulheres passa", () => {
  const r = avaliarElegibilidadeBrasil("Joao Pessoa, PB", "Vaga afirmativa para mulheres. Requisitos: suporte.", "Analista de Suporte", false)
  assert.equal(r.situacao, "compativel")
})

test("N3 atendimento exclusivamente remoto passa", () => {
  const r = avaliarElegibilidadeBrasil("Joao Pessoa, PB", "Atendimento exclusivamente remoto, PCDs bem-vindos.", "Analista de Suporte", true)
  assert.equal(r.situacao, "compativel")
})

test("N4 titulo normal continua compativel", () => {
  const r = avaliarElegibilidadeBrasil("Joao Pessoa, PB", null, "Analista de Suporte", false)
  assert.equal(r.situacao, "compativel")
})
