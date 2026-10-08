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

    /**
     * O fixture padrão representa uma vaga presencial válida.
     */
    location: "João Pessoa, PB",

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

  test("mantém vaga em português quando a localização é apenas Remote", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        title: "Analista de Suporte",

        location: "Remote",

        remote: true,

        description: "Suporte técnico utilizando SQL, PostgreSQL e atendimento a usuários."
      }),
      perfil
    )

    assert.ok(resultado.score >= 60)

    assert.ok(
      resultado.reasons.includes("Localização ainda não confirmada; vaga mantida para análise")
    )
  })

  test("rejeita vaga presencial fora de João Pessoa (RMPJP estrita)", () => {
  const perfil = criarPerfil()

  const resultado = matchJob(
    criarVaga({
      location: "São Paulo, SP",
      remote: false
    }),
    perfil
  )

  assert.equal(resultado.score, 0)
  assert.ok(resultado.reasons[0]?.includes("região metropolitana de João Pessoa"))
})

  test("aceita presencial em Governador Valadares com cargo compatível (M3)", () => {
  const perfil = criarPerfil()

  const resultado = matchJob(
    criarVaga({
      title: "Analista de Suporte TI Junior",
      location: "Governador Valadares, Minas Gerais, Brasil",
      remote: false,
      description: "Atendimento remoto e presencial, suporte técnico e redes."
    }),
    perfil
  )

  assert.ok(resultado.score >= 60)
})

  test("aceita vagas remotas em outras localidades brasileiras", () => {
    const perfil = criarPerfil()

    const blumenau = matchJob(
      criarVaga({
        location: "Blumenau, SC",

        remote: true
      }),
      perfil
    )

    const brasilia = matchJob(
      criarVaga({
        location: "Brasília, DF",

        remote: true
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

    assert.ok(resultado.reasons[0]?.includes("fora do Brasil"))
  })

  test("rejeita Hyderabad mesmo quando o cargo seria compatível", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        title: "Analista de Suporte",

        location: "Hyderabad",

        remote: false
      }),
      perfil
    )

    assert.equal(resultado.score, 0)
  })

  test("rejeita Thessaloniki Greece mesmo que marcada como remota", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        title: "Analista de Suporte",

        location: "Thessaloniki, Greece",

        remote: true
      }),
      perfil
    )

    assert.equal(resultado.score, 0)
  })

  test("rejeita localização US", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        title: "Analista de Suporte",

        location: "US",

        remote: true
      }),
      perfil
    )

    assert.equal(resultado.score, 0)
  })

  test("rejeita título sem cargo aderente mesmo localizado no Brasil (M4)", () => {
  const perfil = criarPerfil()

  const resultado = matchJob(
    criarVaga({
      title: "IT Support Engineer",
      location: "Brasil",
      remote: true
    }),
    perfil
  )

  assert.equal(resultado.score, 0)
  assert.ok(resultado.reasons.some(motivo => motivo.includes("famílias profissionais")))
})

  test("aceita Technical Support Specialist no Brasil com desconto de título (M4)", () => {
  const perfil = criarPerfil()

  const resultado = matchJob(
    criarVaga({
      title: "Technical Support Specialist",
      location: "Brazil - Remote",
      remote: true,
      description: "Technical support with SQL, PostgreSQL, Active Directory and troubleshooting."
    }),
    perfil
  )

  assert.ok(resultado.score >= 60)
  assert.ok(resultado.reasons.some(motivo => motivo.includes("Título fora do foco")))
})

  test("documenta comportamento atual de título misto desvio + suporte", () => {
  // TODO(matcher): hoje o matcher prioriza cargosPrincipais antes de
  // checar cargosDesvio. Um título que contém ambos — por exemplo
  // "Software Developer I (Technical Support Specialist I)" — acaba
  // sendo aceito como principal. Este teste documenta o comportamento
  // atual e serve de trava até que exista uma decisão explícita sobre
  // o que fazer quando cargo principal e cargo de desvio coexistem.
  const perfil = criarPerfil()

  const resultado = matchJob(
    criarVaga({
      title: "Software Developer I (Technical Support Specialist I)",
      location: "Brasil",
      remote: true,
      description: "Technical support with SQL and troubleshooting."
    }),
    perfil
  )

  assert.ok(resultado.score >= 60)
})

  test("aceita vaga híbrida fora de João Pessoa (M3)", () => {
  const perfil = criarPerfil()

  const resultado = matchJob(
    criarVaga({
      title: "Analista de Suporte",
      location: "São Paulo, SP",
      remote: false,
      description: "Modelo híbrido, com três dias presenciais por semana."
    }),
    perfil
  )

  assert.ok(resultado.score >= 60)
  assert.ok(!resultado.reasons.some(motivo => motivo.includes("fora de João Pessoa")))
})

  test("aceita vaga híbrida em Pernambuco (M3)", () => {
  const perfil = criarPerfil()

  const resultado = matchJob(
    criarVaga({
      title: "Analista de Suporte",
      location: "Recife, PE",
      remote: false,
      description: "Trabalho híbrido com comparecimento ao escritório duas vezes por semana."
    }),
    perfil
  )

  assert.ok(resultado.score >= 60)
})

  test("aceita vaga híbrida em João Pessoa PB", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        title: "Analista de Suporte",

        location: "João Pessoa, PB",

        remote: false,

        description: "Modelo híbrido, com atuação em João Pessoa."
      }),
      perfil
    )

    assert.ok(resultado.score >= 60)
  })

  test("aceita vaga híbrida em Campina Grande PB (M3)", () => {
  const perfil = criarPerfil()

  const resultado = matchJob(
    criarVaga({
      title: "Analista de Suporte",
      location: "Campina Grande, PB",
      remote: false,
      description: "Modalidade híbrida para atuação em Campina Grande."
    }),
    perfil
  )

  assert.ok(resultado.score >= 60)
})

  test("limita vaga de outra trilha profissional abaixo do corte de relevância", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        title: "Desenvolvedor de Software",

        description: "Desenvolvimento de aplicações utilizando SQL, PostgreSQL, Grafana e Zabbix."
      }),
      perfil
    )

    assert.ok(resultado.score <= 55)
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

  test("não aceita cargo desconhecido apenas por formação compatível", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        title: "Especialista de Operações Tecnológicas",

        description:
          "Requisito: formação superior em Ciência da Computação, Sistemas de Informação, Análise e Desenvolvimento de Sistemas ou áreas correlatas.",

        location: "João Pessoa, PB"
      }),
      perfil
    )

    assert.equal(resultado.score, 0)

    assert.deepEqual(resultado.matchedSkills, [])

    assert.ok(resultado.reasons.some(motivo => motivo.includes("Cargo não corresponde")))
  })

  test("rejeita SEO mesmo quando a descrição cita formação e tecnologias compatíveis", () => {
    const perfil = criarPerfil()

    const resultado = matchJob(
      criarVaga({
        title: "Serbian SEO Specialist",

        description:
          "Bachelor degree in Computer Science. Work with SQL, PostgreSQL, Zabbix and Grafana.",

        location: "Brazil - Remote",

        remote: true
      }),
      perfil
    )

    assert.equal(resultado.score, 0)

    assert.deepEqual(resultado.matchedSkills, [])
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


test("fail-fast: vaga geo-bloqueada retorna score 0 sem chegar ao matcher", () => {
  const perfil = criarPerfil()
  const vaga = criarVaga({
    title: "Analista de Suporte Senior",
    location: "Sao Paulo, SP",
    remote: false,
    description: "Suporte tecnico, redes, Windows Server, Linux, SQL."
  })
  const r = matchJob(vaga, perfil)
  assert.equal(r.score, 0)
  assert.ok(r.reasons[0]?.includes("região metropolitana de João Pessoa"))
})
