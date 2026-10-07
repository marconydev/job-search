import assert from "node:assert/strict"

import test from "node:test"

import {
  diagnosticarFunilVagasComYield,
  filtrarVagasAderentesComYield,
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

    publishedAt: null,

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

test("aceita no funil vaga remota Worldwide compatível com o cargo principal", async () => {
  const vaga = criarVaga({
    externalId: "remota-global",

    location: "Worldwide",

    remote: true
  })

  const aderentes = await filtrarVagasAderentesComYield([vaga], criarPerfil())

  assert.deepEqual(
    aderentes.map(item => item.externalId),
    ["remota-global"]
  )
})

test("M3: vaga não remota fora de JP agora é aceita quando título e local são compatíveis", async () => {
  const vaga = criarVaga({
    externalId: "global-nao-remota",

    location: "Worldwide",

    remote: false
  })

  const aderentes = await filtrarVagasAderentesComYield([vaga], criarPerfil())

  assert.equal(aderentes.length, 0)
})

test("diagnostico observa o filtro original sem alterar as vagas aderentes", async () => {
  const vagas: NewJob[] = [
    criarVaga({
      externalId: "antiga",

      publishedAt: "2025-01-01T15:00:00.000Z"
    }),

    criarVaga({
      externalId: "exterior",

      location: "Lisboa, Portugal"
    }),

    criarVaga({
      externalId: "titulo-fora",

      title: "Technical Support Specialist"
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

  const aderentes = await filtrarVagasAderentesComYield(vagas, criarPerfil())

  assert.deepEqual(
    aderentes.map(vaga => vaga.externalId),
    ["presencial-fora", "aderente"]
  )

  const diagnostico = await diagnosticarFunilVagasComYield(
    vagas,
    criarPerfil(),
    aderentes,
    60,
    25,
    AGORA
  )

  assert.equal(diagnostico.recebidas, 6)

  assert.equal(diagnostico.foraDaJanela, 1)

  assert.equal(diagnostico.localizacaoIncompativel, 1)

  assert.equal(diagnostico.tituloForaFoco, 0)


  assert.equal(diagnostico.matcherAbaixoDoMinimo, 2)

  assert.equal(diagnostico.score50a59, 1)

  assert.equal(diagnostico.aderentes, 2)

  assert.equal(diagnostico.divergencias, 0)

  assert.equal(diagnostico.exemplosQuaseAderentes.length, 1)

  assert.equal(diagnostico.exemplosQuaseAderentes[0]?.title, "Analista de Sistemas")

  const totalDiagnosticado =
    diagnostico.foraDaJanela +
    diagnostico.localizacaoIncompativel +
    diagnostico.tituloForaFoco +
    diagnostico.matcherAbaixoDoMinimo +
    diagnostico.aderentes +
    diagnostico.divergencias

  assert.equal(totalDiagnosticado, diagnostico.recebidas)
})
