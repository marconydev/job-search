import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { analisarCurriculo } from "../src/services/analisador-curriculo.js"

import type { PerfilProfissional } from "../src/types/perfil-profissional.js"

function criarPerfil(): PerfilProfissional {
  return {
    resumoProfissional: "",

    cargosPrincipais: ["analista de suporte", "technical support", "application support"],

    cargosRelacionados: ["analista de sistemas", "analista de infraestrutura", "noc analyst"],

    cargosDesvio: ["desenvolvedor", "software developer"],

    competencias: [
      {
        nome: "JavaScript",
        termos: ["javascript", "js"]
      },
      {
        nome: "Node.js",
        termos: ["node.js", "nodejs", "node"]
      },
      {
        nome: "React",
        termos: ["react", "reactjs"]
      },
      {
        nome: "PostgreSQL",
        termos: ["postgresql", "postgres"]
      },
      {
        nome: "Jira",
        termos: ["jira"]
      },
      {
        nome: "Elastic",
        termos: ["elastic", "elasticsearch", "kibana"]
      },
      {
        nome: "Análise de Logs",
        termos: ["analise de logs", "log analysis"]
      },
      {
        nome: "Análise de Dados",
        termos: ["analise de dados", "data analysis"]
      },
      {
        nome: "Sistemas Hospitalares",
        termos: ["sistemas hospitalares", "sistema hospitalar", "his"]
      }
    ],

    experiencias: [],

    formacoes: [],

    cursos: [],

    localizacoesAceitas: ["brasil", "brazil"],

    titulosExcluidos: []
  }
}

function analisar(texto: string) {
  return analisarCurriculo(
    {
      nome: "curriculo-teste.txt",
      tipo: "text/plain",
      tamanho: Buffer.byteLength(texto)
    },
    texto,
    criarPerfil()
  )
}

describe("analisador de currículo", () => {
  test("extrai informações de um currículo estruturado em português", () => {
    const resultado = analisar(`
PERFIL PROFISSIONAL

Profissional de tecnologia com experiência em suporte técnico, sistemas e análise de incidentes.

COMPETÊNCIAS

JavaScript
Node.js
PostgreSQL
Jira
Elastic
Análise de Logs

EXPERIÊNCIA PROFISSIONAL

Analista de Suporte
Hospital Tecnologia Ltda
Junho de 2025 - Atual
Atendimento técnico, análise de logs, PostgreSQL e suporte a sistemas hospitalares.

FORMAÇÃO ACADÊMICA

Tecnólogo em Análise e Desenvolvimento de Sistemas
Universidade Exemplo
2020 - 2022

CURSOS E CERTIFICAÇÕES

Zabbix 2024
Git e GitHub 2025
`)

    assert.ok(resultado.sugestoes.resumoProfissional.includes("Profissional de tecnologia"))

    const competencias = resultado.sugestoes.competencias.map(item => item.nome)

    assert.ok(competencias.includes("JavaScript"))
    assert.ok(competencias.includes("Node.js"))
    assert.ok(competencias.includes("PostgreSQL"))
    assert.ok(competencias.includes("Jira"))
    assert.ok(competencias.includes("Elastic"))
    assert.ok(competencias.includes("Análise de Logs"))

    assert.ok(resultado.sugestoes.experiencias.length >= 1)

    assert.ok(
      resultado.sugestoes.experiencias.some(
        experiencia => experiencia.cargo === "Analista de Suporte"
      )
    )

    assert.ok(resultado.sugestoes.formacoes.length >= 1)

    assert.ok(
      resultado.sugestoes.formacoes.some(formacao =>
        formacao.curso.toLowerCase().includes("análise e desenvolvimento de sistemas")
      )
    )

    assert.ok(resultado.sugestoes.cursos.length >= 1)
  })

  test("encontra competências mesmo quando não existe seção de competências", () => {
    const resultado = analisar(`
PERFIL PROFISSIONAL

Profissional responsável por suporte a aplicações e análise de incidentes.

EXPERIÊNCIA PROFISSIONAL

Analista de Suporte
Empresa Tecnologia Ltda
2022 - 2025
Atuação diária com PostgreSQL, Jira, Elasticsearch, Kibana e análise de logs.

FORMAÇÃO ACADÊMICA

Análise e Desenvolvimento de Sistemas
Universidade Exemplo
2019 - 2021
`)

    const competencias = resultado.sugestoes.competencias.map(item => item.nome)

    assert.ok(competencias.includes("PostgreSQL"))
    assert.ok(competencias.includes("Jira"))
    assert.ok(competencias.includes("Elastic"))
    assert.ok(competencias.includes("Análise de Logs"))
  })

  test("reconhece experiência com cargo, empresa e período em linhas separadas", () => {
    const resultado = analisar(`
EXPERIÊNCIA PROFISSIONAL

Analista de Sistemas
Empresa Tecnologia Ltda
06/2023 - 08/2025
Suporte a aplicações, análise de incidentes e PostgreSQL.
`)

    const experiencia = resultado.sugestoes.experiencias.find(
      item => item.cargo === "Analista de Sistemas"
    )

    assert.ok(experiencia)
    assert.equal(experiencia.empresa, "Empresa Tecnologia Ltda")
    assert.ok(experiencia.periodo.includes("06/2023"))
    assert.ok(experiencia.periodo.includes("08/2025"))
  })

  test("reconhece experiência quando empresa aparece antes do cargo", () => {
    const resultado = analisar(`
EXPERIÊNCIA PROFISSIONAL

Empresa Tecnologia Ltda
Analista de Suporte
2021 - 2024
Atendimento técnico e análise de incidentes.
`)

    assert.ok(
      resultado.sugestoes.experiencias.some(
        experiencia =>
          experiencia.cargo === "Analista de Suporte" &&
          experiencia.empresa === "Empresa Tecnologia Ltda"
      )
    )
  })

  test("reconhece experiência quando o período aparece antes do cargo e da empresa", () => {
    const resultado = analisar(`
EXPERIÊNCIA PROFISSIONAL

2020 - 2023
Analista de Infraestrutura
Grupo Tecnologia Ltda
Administração de infraestrutura e suporte técnico.
`)

    assert.ok(
      resultado.sugestoes.experiencias.some(
        experiencia =>
          experiencia.cargo === "Analista de Infraestrutura" &&
          experiencia.empresa === "Grupo Tecnologia Ltda"
      )
    )
  })

  test("reconhece formação acadêmica em várias linhas", () => {
    const resultado = analisar(`
FORMAÇÃO ACADÊMICA

Tecnólogo em Análise e Desenvolvimento de Sistemas
Universidade Exemplo
2018 - 2020
`)

    const formacao = resultado.sugestoes.formacoes.find(item =>
      item.curso.toLowerCase().includes("análise e desenvolvimento de sistemas")
    )

    assert.ok(formacao)
    assert.equal(formacao.instituicao, "Universidade Exemplo")
    assert.equal(formacao.nivel, "Tecnólogo")
  })

  test("reconhece formação acadêmica mesmo sem período informado", () => {
    const resultado = analisar(`
FORMAÇÃO ACADÊMICA

Especialização em Engenharia de Software
Universidade Exemplo
`)

    const formacao = resultado.sugestoes.formacoes.find(item =>
      item.curso.toLowerCase().includes("engenharia de software")
    )

    assert.ok(formacao)
    assert.equal(formacao.instituicao, "Universidade Exemplo")
    assert.equal(formacao.nivel, "Especialização")
    assert.equal(formacao.periodo, "")
  })

  test("reconhece títulos de seções em inglês", () => {
    const resultado = analisar(`
PROFESSIONAL SUMMARY

Technology professional with experience in technical support and application operations.

TECHNICAL SKILLS

JavaScript
Node.js
React
PostgreSQL
Jira

WORK EXPERIENCE

Technical Support Analyst
Technology Company Inc
2022 - Present
Application support, PostgreSQL and log analysis.

EDUCATION

Technology Degree in Information Systems
Example University
2018 - 2020

CERTIFICATIONS

Node.js Fundamentals 2024
`)

    assert.ok(resultado.sugestoes.resumoProfissional.includes("Technology professional"))

    const competencias = resultado.sugestoes.competencias.map(item => item.nome)

    assert.ok(competencias.includes("JavaScript"))
    assert.ok(competencias.includes("Node.js"))
    assert.ok(competencias.includes("React"))
    assert.ok(competencias.includes("PostgreSQL"))
    assert.ok(competencias.includes("Jira"))

    assert.ok(resultado.sugestoes.experiencias.length >= 1)
    assert.ok(resultado.sugestoes.formacoes.length >= 1)
  })

  test("reconhece cursos separados por ponto e vírgula", () => {
    const resultado = analisar(`
CURSOS E CERTIFICAÇÕES

Git e GitHub 2024; Zabbix 2025; Fundamentos de Redes 2023
`)

    const cursos = resultado.sugestoes.cursos.map(item => item.nome)

    assert.ok(cursos.includes("Git e GitHub"))
    assert.ok(cursos.includes("Zabbix"))
    assert.ok(cursos.includes("Fundamentos de Redes"))
  })

  test("não duplica o mesmo curso quando ele aparece repetido", () => {
    const resultado = analisar(`
CURSOS

Zabbix 2024
Zabbix 2024
Zabbix 2024
`)

    const cursosZabbix = resultado.sugestoes.cursos.filter(
      item => item.nome.toLowerCase() === "zabbix"
    )

    assert.equal(cursosZabbix.length, 1)
  })

  test("retorna avisos quando não consegue estruturar informações", () => {
    const resultado = analisar(`
João da Silva

Documento simples sem informações profissionais estruturadas.
`)

    assert.ok(resultado.avisos.length > 0)

    assert.ok(resultado.avisos.some(aviso => aviso.includes("experiências profissionais")))

    assert.ok(resultado.avisos.some(aviso => aviso.includes("formação acadêmica")))
  })

  test("preserva o texto original recebido", () => {
    const texto = `
PERFIL PROFISSIONAL

Profissional de tecnologia com experiência em suporte.
`

    const resultado = analisar(texto)

    assert.equal(resultado.textoExtraido, texto)
  })
})
