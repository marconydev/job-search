import assert from "node:assert/strict"
import test from "node:test"

import { avaliarElegibilidadeBrasil } from "../src/services/elegibilidade-localizacao.js"

test("PingWind: location='Remote' puro sem menção ao Brasil é rejeitada", () => {
  const r = avaliarElegibilidadeBrasil(
    "Remote",
    "Help Desk Support Agent (Mid). Support for the U.S. Department of Education. Requires Public Trust.",
    "Help Desk Support Agent (Mid)",
    true,
    [],
    "remote"
  )
  assert.equal(r.situacao, "incompativel")
})

test("PingWind: 'Remote' + Brazil na descrição continua compatível", () => {
  const r = avaliarElegibilidadeBrasil(
    "Remote",
    "This role is open to candidates based in Brazil.",
    "Help Desk Support Agent (Mid)",
    true,
    [],
    "remote"
  )
  assert.equal(r.situacao, "compativel")
})

test("PingWind: 'Remote, USA' continua incompatível (bandeira estrangeira)", () => {
  const r = avaliarElegibilidadeBrasil(
    "Remote, USA",
    null,
    "Help Desk Support Agent (Mid)",
    true,
    [],
    "remote"
  )
  assert.equal(r.situacao, "incompativel")
})

test("PingWind: 'Remote' + título com UF brasileira continua compatível", () => {
  const r = avaliarElegibilidadeBrasil(
    "Remote",
    null,
    "Analista de Suporte - SP",
    true,
    [],
    "remote"
  )
  assert.equal(r.situacao, "compativel")
})

test("PingWind: location=null + remote=true sem sinal BR continua indefinida", () => {
  const r = avaliarElegibilidadeBrasil(
    null,
    "Generic support role.",
    "Support Agent",
    true,
    [],
    "remote"
  )
  assert.equal(r.situacao, "indefinida")
})
