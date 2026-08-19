import assert from "node:assert/strict"

import { describe, test } from "node:test"

import { gerarConsultasBuscaVagas } from "../src/config/search-queries.js"

import type { PerfilProfissional } from "../src/types/perfil-profissional.js"

function criarPerfil(): PerfilProfissional {
  return {
    resumoProfissional: "",

    cargosPrincipais: [
      "Analista de Suporte",
      "Technical Support",
      "Analista de Sistemas",
      "Application Support",
      "Analista de Infraestrutura",
      "NOC Analyst",
      "Analista de Implantação"
    ],

    cargosRelacionados: [
      "Customer Onboarding",
      "Analista de Processos",
      "Analista de Dados",
      "BI Analyst"
    ],

    cargosDesvio: ["Software Developer"],

    competencias: [],

    experiencias: [],

    formacoes: [],

    cursos: [],

    localizacoesAceitas: ["Brasil", "Brazil"],

    titulosExcluidos: []
  }
}

describe("gerador de consultas de vagas", () => {
  test("trata Gupy e Sólides como portais prioritários", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const gupy = consultas.filter(consulta => consulta.plataforma === "gupy")

    const solides = consultas.filter(consulta => consulta.plataforma === "solides")

    assert.ok(gupy.length >= 6)

    assert.ok(solides.length >= 6)

    assert.ok(
      gupy.some(
        consulta =>
          consulta.familia === "portal-suporte" && consulta.texto.includes('"Analista de Suporte"')
      )
    )

    assert.ok(
      solides.some(
        consulta =>
          consulta.familia === "portal-suporte" && consulta.texto.includes('"Analista de Suporte"')
      )
    )

    const titulosPrincipais = [
      "Analista de Suporte",
      "Analista de Sistemas",
      "Analista de Infraestrutura",
      "Analista de Implantação",
      "Analista de Processos",
      "Analista de Dados"
    ]

    for (const titulo of titulosPrincipais) {
      for (const plataforma of ["gupy", "solides"]) {
        const consulta = consultas.find(
          item =>
            item.plataforma === plataforma &&
            item.recorrencia === "diaria" &&
            item.texto.includes(`"${titulo}"`)
        )

        assert.ok(consulta, `Busca diária ausente: ${plataforma} | ${titulo}`)

        assert.equal(consulta.texto.includes(" OR "), false)
      }
    }
  })

  test("equilibra profundidade e cobertura dentro do limite diário", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const diarias = consultas.filter(consulta => consulta.recorrencia === "diaria")

    const custoMaximoDiario = diarias.reduce(
      (total, consulta) => total + consulta.paginasMaximas,
      0
    )

    assert.ok(custoMaximoDiario <= 25)

    const principais = consultas.filter(
      consulta =>
        (consulta.plataforma === "gupy" || consulta.plataforma === "solides") &&
        consulta.recorrencia === "diaria"
    )

    assert.equal(principais.length, 12)

    for (const consulta of principais) {
      if (
        ["portal-suporte", "portal-sistemas", "portal-infraestrutura"].includes(consulta.familia)
      ) {
        assert.equal(consulta.paginasMaximas, 2)
      } else {
        assert.equal(consulta.paginasMaximas, 1)
      }
    }

    const rotativas = consultas.filter(
      consulta =>
        (consulta.plataforma === "gupy" || consulta.plataforma === "solides") &&
        consulta.recorrencia === "rotativa"
    )

    for (const consulta of rotativas) {
      assert.equal(consulta.paginasMaximas, 1)
    }
  })

  test("prioriza sinônimos brasileiros antes dos aliases em inglês", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const suporteGupy = consultas.filter(
      consulta =>
        consulta.plataforma === "gupy" &&
        consulta.familia === "portal-suporte" &&
        consulta.recorrencia === "rotativa"
    )

    const indicePortugues = suporteGupy.findIndex(consulta =>
      consulta.texto.includes('"Analista de Suporte Técnico"')
    )

    const indiceIngles = suporteGupy.findIndex(consulta =>
      consulta.texto.includes('"Technical Support"')
    )

    assert.ok(indicePortugues >= 0)

    assert.ok(indiceIngles >= 0)

    assert.ok(indicePortugues < indiceIngles)

    for (const consulta of suporteGupy) {
      const quantidadeTermos = (consulta.texto.match(/"/g) ?? []).length / 2

      assert.ok(quantidadeTermos <= 2)
    }
  })

  test("não exige Brasil dentro da consulta dos portais antes da análise", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const portais = consultas.filter(
      consulta => consulta.plataforma === "gupy" || consulta.plataforma === "solides"
    )

    for (const consulta of portais) {
      assert.equal(consulta.texto.includes("(Brasil OR Brazil)"), false)
    }
  })

  test("mantém fontes complementares relevantes", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const plataformas = new Set(consultas.map(consulta => consulta.plataforma))

    assert.ok(plataformas.has("linkedin"))

    assert.ok(plataformas.has("indeed"))

    assert.ok(plataformas.has("workday"))

    assert.ok(plataformas.has("portais-br"))

    assert.ok(plataformas.has("ats"))

    assert.ok(plataformas.has("remote-rocketship"))

    assert.ok(plataformas.has("web"))
  })

  test("inclui Remote Rocketship somente como fonte de descoberta", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const remoteRocketship = consultas.filter(
      consulta => consulta.plataforma === "remote-rocketship"
    )

    assert.ok(remoteRocketship.length > 0)

    for (const consulta of remoteRocketship) {
      assert.ok(consulta.texto.includes("site:remoterocketship.com/company"))

      assert.ok(consulta.texto.includes("site:remoterocketship.com/br/empresa"))

      assert.equal(consulta.paginasMaximas, 1)
    }
  })

  test("restringe fontes globais complementares ao Brasil", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const globais = consultas.filter(consulta =>
      ["linkedin", "workday", "ats", "web"].includes(consulta.plataforma)
    )

    assert.ok(globais.length > 0)

    for (const consulta of globais) {
      assert.ok(
        consulta.texto.includes("Brasil") || consulta.texto.includes("Brazil"),
        `Consulta global sem Brasil: ${consulta.texto}`
      )
    }
  })

  test("prioriza bancos fintechs e empresas de tecnologia", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const estrategicas = consultas.filter(consulta => consulta.familia === "empresas")

    assert.equal(estrategicas.length, 3)

    const texto = estrategicas.map(consulta => consulta.texto.toLowerCase()).join("\n")

    const empresasEsperadas = [
      "itaú",
      "bradesco",
      "safra",
      "sicredi",
      "nubank",
      "neon",
      "mercado livre",
      "mercado pago",
      "picpay",
      "inter",
      "pagbank",
      "stone",
      "c6 bank",
      "totvs",
      "accenture",
      "senior sistemas",
      "softplan",
      "tivit",
      "matera",
      "serasa experian"
    ]

    for (const empresa of empresasEsperadas) {
      assert.ok(texto.includes(empresa), `Empresa estratégica ausente: ${empresa}`)
    }
  })

  test("mantém prioridades regionais sem duplicar Gupy", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const regionais = consultas.filter(consulta => consulta.familia === "regional")

    assert.equal(regionais.length, 3)

    const texto = regionais.map(consulta => consulta.texto).join("\n")

    assert.ok(texto.includes("São Paulo"))

    assert.ok(texto.includes("Blumenau"))

    assert.ok(texto.includes("Brasília"))

    assert.equal(texto.includes("site:gupy.io"), false)
  })

  test("inclui todos os cargos buscados em alguma estratégia", () => {
    const perfil = criarPerfil()

    const consultas = gerarConsultasBuscaVagas(perfil)

    const texto = consultas.map(consulta => consulta.texto.toLowerCase()).join("\n")

    for (const cargo of [...perfil.cargosPrincipais, ...perfil.cargosRelacionados]) {
      assert.ok(texto.includes(`"${cargo.toLowerCase()}"`), `Cargo ausente das consultas: ${cargo}`)
    }
  })

  test("não usa cargos de desvio na descoberta", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const texto = consultas.map(consulta => consulta.texto.toLowerCase()).join("\n")

    assert.equal(texto.includes('"software developer"'), false)
  })

  test("não gera consultas duplicadas", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const unicas = new Set(consultas.map(consulta => consulta.texto))

    assert.equal(unicas.size, consultas.length)
  })

  test("não volta a procurar regiões globais", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const texto = ` ${consultas.map(consulta => consulta.texto.toLowerCase()).join(" ")} `

    assert.equal(texto.includes(" latam "), false)

    assert.equal(texto.includes(" latin america "), false)

    assert.equal(texto.includes(" worldwide "), false)

    assert.equal(texto.includes(" anywhere "), false)
  })

  test("mantém consultas e paginação dentro de limites seguros", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    for (const consulta of consultas) {
      assert.ok(consulta.texto.length <= 400, `Consulta longa demais: ${consulta.texto}`)

      const palavras = consulta.texto.trim().split(/\s+/).length

      assert.ok(palavras <= 50, `Consulta com palavras demais: ${consulta.texto}`)

      assert.ok(consulta.paginasMaximas >= 1 && consulta.paginasMaximas <= 2)
    }
  })
})
