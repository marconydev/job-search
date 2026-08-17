import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { definirPerfilProfissionalAtivo, matchJob } from "../src/services/job-matcher.js"

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
    definirPerfilProfissionalAtivo(criarPerfil())

    const resultado = matchJob(
      criarVaga({
        title: "Analista de Suporte",
        description: "Atuação com SQL, PostgreSQL, suporte técnico e análise de incidentes."
      })
    )

    assert.ok(resultado.score >= 60)

    assert.ok(resultado.reasons.includes("Cargo diretamente relacionado ao perfil"))
  })

  test("atribui pontuação adicional para vaga remota", () => {
    definirPerfilProfissionalAtivo(criarPerfil())

    const presencial = matchJob(
      criarVaga({
        remote: false
      })
    )

    const remota = matchJob(
      criarVaga({
        remote: true
      })
    )

    assert.equal(remota.score, Math.min(presencial.score + 10, 100))

    assert.ok(remota.reasons.includes("Vaga remota"))
  })

  test("rejeita vaga com localização incompatível", () => {
    definirPerfilProfissionalAtivo(criarPerfil())

    const resultado = matchJob(
      criarVaga({
        location: "Lisboa, Portugal",
        remote: false
      })
    )

    assert.equal(resultado.score, 0)

    assert.deepEqual(resultado.reasons, ["Localização não compatível com a busca"])
  })

  test("limita vaga de outra trilha profissional abaixo do corte de relevância", () => {
    definirPerfilProfissionalAtivo(criarPerfil())

    const resultado = matchJob(
      criarVaga({
        title: "Software Developer",
        description: "Desenvolvimento de aplicações utilizando SQL, PostgreSQL, Grafana e Zabbix."
      })
    )

    assert.ok(resultado.score <= 55)

    assert.ok(
      resultado.reasons.includes(
        "Cargo pertence a uma trilha profissional diferente da busca principal"
      )
    )
  })

  test("reconhece competências sem contar tecnologias irrelevantes", () => {
    definirPerfilProfissionalAtivo(criarPerfil())

    const resultado = matchJob(
      criarVaga({
        description:
          "Suporte a ambientes PostgreSQL, SQL, Zabbix e Grafana. Conhecimento adicional em ferramenta inexistente."
      })
    )

    assert.deepEqual(
      resultado.matchedSkills.sort(),
      ["Grafana", "PostgreSQL", "SQL", "Zabbix"].sort()
    )
  })

  test("considera formação compatível para cargo ainda desconhecido", () => {
    definirPerfilProfissionalAtivo(criarPerfil())

    const resultado = matchJob(
      criarVaga({
        title: "Especialista de Operações Tecnológicas",
        description:
          "Requisito: formação superior em Ciência da Computação, Sistemas de Informação, Análise e Desenvolvimento de Sistemas ou áreas correlatas.",
        location: "Brasil"
      })
    )

    assert.ok(resultado.score >= 60)

    assert.ok(resultado.reasons.some(motivo => motivo.includes("Formação acadêmica compatível")))
  })

  test("rejeita título explicitamente excluído", () => {
    definirPerfilProfissionalAtivo(criarPerfil())

    const resultado = matchJob(
      criarVaga({
        title: "Senior Manager de Suporte"
      })
    )

    assert.equal(resultado.score, 0)

    assert.deepEqual(resultado.reasons, ["Cargo fora da senioridade ou do tipo de vaga buscado"])
  })
})
