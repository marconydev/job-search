import assert from "node:assert/strict"

import test from "node:test"

import { vagaEstaDentroDaJanelaTemporal } from "../src/services/filtragem-vagas.js"

const AGORA = new Date("2026-08-26T15:00:00.000Z")

test("aceita vaga recente com data de publicacao conhecida", () => {
  assert.equal(
    vagaEstaDentroDaJanelaTemporal(
      {
        publishedAt: "2026-08-19T15:00:00.000Z"
      },
      AGORA
    ),
    true
  )
})

test("aceita vaga entre 15 e 21 dias porque a coleta atual confirma sua existencia", () => {
  assert.equal(
    vagaEstaDentroDaJanelaTemporal(
      {
        publishedAt: "2026-08-07T15:00:00.000Z"
      },
      AGORA
    ),
    true
  )
})

test("rejeita nova oportunidade com mais de 21 dias", () => {
  assert.equal(
    vagaEstaDentroDaJanelaTemporal(
      {
        publishedAt: "2026-08-01T15:00:00.000Z"
      },
      AGORA
    ),
    false
  )
})

test("mantem vaga sem publishedAt para controlar idade a partir de quando foi encontrada", () => {
  assert.equal(
    vagaEstaDentroDaJanelaTemporal(
      {
        publishedAt: null
      },
      AGORA
    ),
    true
  )
})

test("nao descarta vaga por uma data invalida fornecida pela origem", () => {
  assert.equal(
    vagaEstaDentroDaJanelaTemporal(
      {
        publishedAt: "data-invalida"
      },
      AGORA
    ),
    true
  )
})
