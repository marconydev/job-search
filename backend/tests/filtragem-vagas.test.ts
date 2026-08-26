import assert from "node:assert/strict"

import test from "node:test"

import {
  filtrarVagasComDiagnosticoComYield,
  vagaEstaDentroDaJanelaTemporal
} from "../src/services/filtragem-vagas.js"

import type { NewJob } from "../src/types/job.js"

import type { PerfilProfissional } from "../src/types/perfil-profissional.js"

const AGORA = new Date("2026-08-26T15:00:00.000Z")

function criarPerfil(): PerfilProfissional {
  return {
    resumoProfissional: "",

    cargosPrincipais: ["Analista de Suporte"],

    cargosRelacionados: ["Analista de Sistemas"],

    cargosDesvio: [],

    competencias: [],

    experiencias: [],

    formacoes: [],

    cursos: [],

    localizacoesAceitas: ["Brasil"],

    titulosExcluidos: []
  }
}

function criarVaga(alteracoes: Partial<NewJob> = {}): NewJob {
  return {
    source: "teste",

    externalId: "vaga-1",

    company: "Empresa Teste",

    title: "Analista de Suporte",

    description: "Atendimento técnico e suporte a usuários.",

    location: "Brasil",

    remote: true,

    url: "https://example.com/vaga",

    publishedAt: "2026-08-25T15:00:00.000Z",

    partial: false,

    ...alteracoes
  }
}

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

test("diagnostica cada etapa sem persistir vagas rejeitadas", async () => {
  const vagas: NewJob[] = [
    criarVaga({
      externalId: "antiga",

      publishedAt: "2026-08-01T15:00:00.000Z"
    }),

    criarVaga({
      externalId: "exterior",

      location: "Lisboa, Portugal"
    }),

    criarVaga({
      externalId: "presencial-fora",

      location: "São Paulo, SP",

      remote: false
    }),

    criarVaga({
      externalId: "quase",

      title: "Analista de Sistemas",

      location: "Remote",

      remote: true
    }),

    criarVaga({
      externalId: "aderente"
    })
  ]

  const resultado = await filtrarVagasComDiagnosticoComYield(vagas, criarPerfil(), 60, 25, AGORA)

  assert.deepEqual(
    resultado.vagasAderentes.map(vaga => vaga.externalId),
    ["aderente"]
  )

  assert.equal(resultado.diagnostico.recebidas, 5)

  assert.equal(resultado.diagnostico.foraDaJanela, 1)

  assert.equal(resultado.diagnostico.localizacaoIncompativel, 1)

  assert.equal(resultado.diagnostico.politicaBrasilIncompativel, 1)

  assert.equal(resultado.diagnostico.matcherAbaixoDoMinimo, 1)

  assert.equal(resultado.diagnostico.score50a59, 1)

  assert.equal(resultado.diagnostico.aderentes, 1)

  assert.equal(resultado.diagnostico.exemplosQuaseAderentes.length, 1)

  assert.equal(resultado.diagnostico.exemplosQuaseAderentes[0]?.title, "Analista de Sistemas")
})
