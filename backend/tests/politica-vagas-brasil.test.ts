import assert from "node:assert/strict"
import test from "node:test"

import {
  avaliarPoliticaVagaBrasil,
  tituloEstaNoFocoBrasil
} from "../src/services/politica-vagas-brasil.js"

test("título brasileiro está no foco", () => {
  assert.equal(tituloEstaNoFocoBrasil("Analista de Suporte"), true)
})

test("título em inglês não está no foco", () => {
  assert.equal(tituloEstaNoFocoBrasil("Technical Support Specialist"), false)
})

test("M3: vaga fora de João Pessoa é permitida", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Analista de Suporte",
    location: "Curitiba, PR",
    remote: false
  })
  assert.equal(r.permitida, true)
  assert.equal(r.desconto, 0)
})

test("M4: título em inglês desconta mas não bloqueia", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Technical Support",
    location: "São Paulo, SP",
    remote: true
  })
  assert.equal(r.permitida, true)
  assert.ok(r.desconto > 0)
})
