import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  detectarTrabalhoRemoto,
  ehProvedorProcessavel,
  normalizarPaginaParaInspecao,
  paginaEhListagem,
  paginaEstaIndisponivel,
  paginaPareceConteudoInformativo,
  paginaPareceRelacionada,
  paginaTemSinalBrasil
} from "../src/services/vagas-web/triagem-vagas-web.js"

import type { PaginaClassificada } from "../src/types/discovery.js"

import type { PerfilProfissional } from "../src/types/perfil-profissional.js"

import type { PaginaSomenteDescoberta } from "../src/types/processamento-web.js"

function criarPerfil(): PerfilProfissional {
  return {
    resumoProfissional: "",

    cargosPrincipais: ["analista de suporte", "technical support"],

    cargosRelacionados: ["analista de sistemas", "analista de infraestrutura"],

    cargosDesvio: ["desenvolvedor", "software developer"],

    competencias: [
      {
        nome: "PostgreSQL",
        termos: ["postgresql", "postgres"]
      },
      {
        nome: "Grafana",
        termos: ["grafana"]
      },
      {
        nome: "Zabbix",
        termos: ["zabbix"]
      }
    ],

    experiencias: [],

    formacoes: [],

    cursos: [],

    localizacoesAceitas: ["brasil", "brazil"],

    titulosExcluidos: []
  }
}

function criarPaginaClassificada(alteracoes: Partial<PaginaClassificada> = {}): PaginaClassificada {
  return {
    origem: "teste",
    consulta: "analista de suporte",
    titulo: "Analista de Suporte",
    url: "https://empresa.example/jobs/123",
    descricao: "Suporte técnico a aplicações.",
    provedor: "pagina-propria",
    ...alteracoes
  }
}

function criarPaginaDescoberta(
  alteracoes: Partial<PaginaSomenteDescoberta> = {}
): PaginaSomenteDescoberta {
  return {
    provedor: "pagina-propria",
    titulo: "Analista de Suporte",
    url: "https://empresa.example/vaga",
    descricao: "Oportunidade localizada no Brasil.",
    consulta: "analista de suporte Brasil",
    ...alteracoes
  }
}

describe("triagem de vagas web", () => {
  test("considera relacionada uma página com cargo diretamente compatível", () => {
    const pagina = criarPaginaClassificada({
      titulo: "Analista de Suporte N2"
    })

    assert.equal(paginaPareceRelacionada(pagina, criarPerfil()), true)
  })

  test("considera relacionada uma página com indicador de cargo e duas competências", () => {
    const pagina = criarPaginaClassificada({
      titulo: "Especialista de Operações",
      descricao: "Atuação com PostgreSQL e Grafana em ambientes críticos."
    })

    assert.equal(paginaPareceRelacionada(pagina, criarPerfil()), true)
  })

  test("descarta página genérica mesmo contendo somente uma competência", () => {
    const pagina = criarPaginaClassificada({
      titulo: "Especialista de Operações",
      descricao: "Conhecimento em PostgreSQL."
    })

    assert.equal(paginaPareceRelacionada(pagina, criarPerfil()), false)
  })

  test("diferencia páginas de listagem de publicações individuais", () => {
    assert.equal(
      paginaEhListagem(
        criarPaginaClassificada({
          provedor: "linkedin",
          url: "https://www.linkedin.com/jobs/search/?keywords=support"
        })
      ),
      true
    )

    assert.equal(
      paginaEhListagem(
        criarPaginaClassificada({
          provedor: "linkedin",
          url: "https://www.linkedin.com/jobs/view/123456/"
        })
      ),
      false
    )

    assert.equal(
      paginaEhListagem(
        criarPaginaClassificada({
          provedor: "gupy",
          url: "https://empresa.gupy.io/jobs/123456"
        })
      ),
      false
    )
  })

  test("normaliza link de candidatura do Workable antes da inspeção", () => {
    const pagina = criarPaginaClassificada({
      provedor: "workable",
      url: "https://apply.workable.com/empresa/j/ABC123/apply/"
    })

    const normalizada = normalizarPaginaParaInspecao(pagina)

    assert.equal(normalizada.url, "https://apply.workable.com/empresa/j/ABC123/")
  })

  test("identifica provedores que possuem inspeção estruturada", () => {
    assert.equal(
      ehProvedorProcessavel(
        criarPaginaClassificada({
          provedor: "gupy"
        })
      ),
      true
    )

    assert.equal(
      ehProvedorProcessavel(
        criarPaginaClassificada({
          provedor: "linkedin"
        })
      ),
      false
    )
  })

  test("identifica páginas indisponíveis por status ou parâmetro da URL", () => {
    assert.equal(paginaEstaIndisponivel("https://empresa.example/vaga", 404), true)

    assert.equal(paginaEstaIndisponivel("https://empresa.example/vaga?not_found=true", 200), true)

    assert.equal(paginaEstaIndisponivel("https://empresa.example/vaga", 200), false)
  })

  test("descarta conteúdos informativos que não representam vagas", () => {
    assert.equal(
      paginaPareceConteudoInformativo(
        "Technical Support Salary Guide",
        "https://empresa.example/artigo"
      ),
      true
    )

    assert.equal(
      paginaPareceConteudoInformativo(
        "Best Software Tools for Support Teams",
        "https://learn.g2.com/blog/support-tools"
      ),
      true
    )

    assert.equal(
      paginaPareceConteudoInformativo("Analista de Suporte", "https://empresa.example/jobs/123"),
      false
    )
  })

  test("reconhece sinal do Brasil no LinkedIn pela própria oportunidade", () => {
    assert.equal(
      paginaTemSinalBrasil(
        criarPaginaDescoberta({
          provedor: "linkedin",
          url: "https://br.linkedin.com/jobs/view/123",
          titulo: "Technical Support Analyst"
        })
      ),
      true
    )

    assert.equal(
      paginaTemSinalBrasil(
        criarPaginaDescoberta({
          provedor: "linkedin",
          url: "https://www.linkedin.com/jobs/view/123",
          titulo: "Technical Support Analyst - São Paulo",
          descricao: "Opportunity in São Paulo."
        })
      ),
      true
    )
  })

  test("não usa a consulta da busca como prova de localização no Brasil", () => {
    assert.equal(
      paginaTemSinalBrasil(
        criarPaginaDescoberta({
          provedor: "linkedin",
          url: "https://www.linkedin.com/jobs/view/123",
          titulo: "Technical Support Analyst",
          descricao: "Opportunity located in Lisbon, Portugal.",
          consulta: "technical support Brasil"
        })
      ),
      false
    )
  })

  test("Indeed só é considerado brasileiro quando a publicação usa o domínio brasileiro", () => {
    assert.equal(
      paginaTemSinalBrasil(
        criarPaginaDescoberta({
          provedor: "indeed",
          url: "https://br.indeed.com/viewjob?jk=abc123"
        })
      ),
      true
    )

    assert.equal(
      paginaTemSinalBrasil(
        criarPaginaDescoberta({
          provedor: "indeed",
          url: "https://www.indeed.com/viewjob?jk=abc123",
          titulo: "Analista de Suporte - Brasil"
        })
      ),
      false
    )
  })

  test("diferencia vaga remota de simples suporte remoto", () => {
    assert.equal(
      detectarTrabalhoRemoto(
        criarPaginaDescoberta({
          titulo: "Analista de Suporte - Remoto",
          descricao: "Atendimento aos clientes."
        })
      ),
      true
    )

    assert.equal(
      detectarTrabalhoRemoto(
        criarPaginaDescoberta({
          titulo: "Analista de Suporte",
          descricao: "Prestação de suporte remoto aos usuários internos."
        })
      ),
      false
    )

    assert.equal(
      detectarTrabalhoRemoto(
        criarPaginaDescoberta({
          titulo: "Analista de Suporte",
          descricao: "Modelo de trabalho remoto para todo o Brasil."
        })
      ),
      true
    )
  })
})
