import assert from "node:assert/strict"

import { describe, test } from "node:test"

import { matchJob } from "../src/services/job-matcher.js"

import type { PerfilProfissional } from "../src/types/perfil-profissional.js"

import type { StoredJob } from "../src/types/job.js"

function criarPerfil(): PerfilProfissional {
  return {
    resumoProfissional: "",

    cargosPrincipais: ["analista de suporte", "technical support", "application support"],

    cargosRelacionados: ["analista de sistemas", "analista de infraestrutura", "noc analyst"],

    cargosDesvio: ["software developer", "desenvolvedor", "frontend developer"],

    competencias: [
      {
        nome: "SQL",
        termos: ["sql"]
      },
      {
        nome: "PostgreSQL",
        termos: ["postgresql", "postgres"]
      },
      {
        nome: "Zabbix",
        termos: ["zabbix"]
      },
      {
        nome: "Grafana",
        termos: ["grafana"]
      },
      {
        nome: "Active Directory",
        termos: ["active directory"]
      }
    ],

    experiencias: [
      {
        empresa: "Empresa Exemplo",
        cargo: "Analista de Suporte",
        periodo: "2023 - 2025",
        descricao: "Suporte técnico, SQL, PostgreSQL, Zabbix e análise de incidentes."
      }
    ],

    formacoes: [
      {
        instituicao: "Universidade Exemplo",
        curso: "Análise e Desenvolvimento de Sistemas",
        nivel: "Tecnólogo",
        periodo: "2018 - 2020"
      }
    ],

    cursos: [
      {
        nome: "Zabbix",
        instituicao: "Instituição Exemplo",
        ano: "2024"
      }
    ],

    localizacoesAceitas: ["brasil", "brazil", "joao pessoa", "paraiba"],

    titulosExcluidos: ["senior manager", "diretor"]
  }
}

function criarVaga(alteracoes: Partial<StoredJob> = {}): StoredJob {
  return {
    id: 1,

    source: "teste",

    external_id: "vaga-1",

    company: "Empresa Teste",

    title: "Analista de Suporte",

    description: "Suporte técnico utilizando SQL e PostgreSQL.",

    location: "Brasil",

    remote: false,

    url: "https://example.com/vaga",

    published_at: "2026-08-14",

    partial: false,

    created_at: "2026-08-14T12:00:00.000Z",

    ...alteracoes
  }
}

describe("job matcher", () => {
  test("prioriza uma vaga diretamente relacionada ao cargo principal", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        title: "Analista de Suporte",

        description: "Atuação com SQL, PostgreSQL, suporte técnico e análise de incidentes."
      }),
      perfil
    )

    assert.ok(resultado.score >= 60)

    assert.ok(resultado.reasons.includes("Cargo diretamente relacionado ao perfil"))
  })

  test("atribui pontuação adicional para vaga remota", () => {
    const perfil = criarPerfil()

    const presencial = matchJob(
      criarVaga({
        remote: false
      }),
      perfil
    )

    const remota = matchJob(
      criarVaga({
        remote: true
      }),
      perfil
    )

    assert.equal(remota.score, Math.min(presencial.score + 10, 100))

    assert.ok(remota.reasons.includes("Vaga remota"))
  })

  test("aceita cidade brasileira quando o perfil aceita Brasil", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        location: "São Paulo, SP"
      }),
      perfil
    )

    assert.ok(resultado.score >= 60)

    assert.ok(resultado.reasons.includes("Localização compatível"))
  })

  test("aceita localidades prioritárias do sul e centro oeste", () => {
    const perfil = criarPerfil()

    const blumenau = matchJob(
      criarVaga({
        location: "Blumenau, SC"
      }),
      perfil
    )

    const brasilia = matchJob(
      criarVaga({
        location: "Brasília, DF"
      }),
      perfil
    )

    assert.ok(blumenau.score >= 60)

    assert.ok(brasilia.score >= 60)
  })

  test("rejeita vaga com localização incompatível", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        location: "Lisboa, Portugal",

        remote: false
      }),
      perfil
    )

    assert.equal(resultado.score, 0)

    assert.deepEqual(resultado.reasons, ["Localização não compatível com a busca"])
  })

  test("limita vaga de outra trilha profissional abaixo do corte de relevância", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        title: "Software Developer",

        description: "Desenvolvimento de aplicações utilizando SQL, PostgreSQL, Grafana e Zabbix."
      }),
      perfil
    )

    assert.ok(resultado.score <= 55)

    assert.ok(
      resultado.reasons.includes(
        "Cargo pertence a uma trilha profissional diferente da busca principal"
      )
    )
  })

  test("reconhece competências sem contar tecnologias irrelevantes", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        description:
          "Suporte a ambientes PostgreSQL, SQL, Zabbix e Grafana. Conhecimento adicional em ferramenta inexistente."
      }),
      perfil
    )

    assert.deepEqual(
      resultado.matchedSkills.sort(),
      ["Grafana", "PostgreSQL", "SQL", "Zabbix"].sort()
    )
  })

  test("considera formação compatível para cargo ainda desconhecido", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        title: "Especialista de Operações Tecnológicas",

        description:
          "Requisito: formação superior em Ciência da Computação, Sistemas de Informação, Análise e Desenvolvimento de Sistemas ou áreas correlatas.",

        location: "Brasil"
      }),
      perfil
    )

    assert.ok(resultado.score >= 60)

    assert.ok(resultado.reasons.some(motivo => motivo.includes("Formação acadêmica compatível")))
  })

  test("rejeita título explicitamente excluído", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        title: "Senior Manager de Suporte"
      }),
      perfil
    )

    assert.equal(resultado.score, 0)

    assert.deepEqual(resultado.reasons, ["Cargo fora da senioridade ou do tipo de vaga buscado"])
  })

  test("não compartilha estado entre perfis diferentes", () => {
    const perfilSuporte = criarPerfil()

    const perfilDesenvolvimento: PerfilProfissional = {
      ...criarPerfil(),

      cargosPrincipais: ["software developer"],

      cargosRelacionados: [],

      cargosDesvio: ["analista de suporte"]
    }

    const vaga = criarVaga({
      title: "Analista de Suporte",

      description: "Suporte técnico utilizando SQL e PostgreSQL."
    })

    const resultadoSuporte = matchJob(vaga, perfilSuporte)

    const resultadoDesenvolvimento = matchJob(vaga, perfilDesenvolvimento)

    assert.ok(resultadoSuporte.score >= 60)

    assert.ok(resultadoDesenvolvimento.score <= 55)
  })
})
