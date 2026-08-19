import assert from "node:assert/strict"

import { describe, test } from "node:test"

import {
  gerarConsultasBuscaVagas,
  gerarTermosBuscaNativaGupy,
  gerarTermosBuscaNativaSolides
} from "../src/config/search-queries.js"

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
  test("gera os termos que serão pesquisados diretamente na Gupy", () => {
    const termos = gerarTermosBuscaNativaGupy(criarPerfil())

    assert.ok(termos.includes("Analista de Suporte"))

    assert.ok(termos.includes("Technical Support"))

    assert.ok(termos.includes("Analista de Sistemas"))

    assert.ok(termos.includes("Application Support"))

    assert.ok(termos.includes("Analista de Infraestrutura"))

    assert.ok(termos.includes("NOC Analyst"))

    assert.ok(termos.includes("Analista de Implantação"))

    assert.ok(termos.includes("Customer Onboarding"))

    assert.ok(termos.includes("Analista de Processos"))

    assert.ok(termos.includes("Analista de Dados"))

    assert.ok(termos.includes("BI Analyst"))

    /**
     * Termos de desvio nunca entram na descoberta.
     */
    assert.equal(termos.includes("Software Developer"), false)

    assert.ok(termos.length <= 30)
  })

  test("não usa mais Brave para pesquisas dedicadas à Gupy", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const gupy = consultas.filter(consulta => consulta.plataforma === "gupy")

    assert.equal(gupy.length, 0)

    for (const consulta of consultas) {
      assert.equal(consulta.texto.includes("site:gupy.io"), false)
    }
  })

  test("não usa mais Brave para pesquisas dedicadas à Sólides", () => {
    const consultas =
      gerarConsultasBuscaVagas(
        criarPerfil()
      )

    const solides = consultas.filter(
      consulta =>
        consulta.plataforma === "solides"
    )

    assert.equal(
      solides.length,
      0
    )

    for (const consulta of consultas) {
      assert.equal(
        consulta.texto.includes(
          "site:vagas.solides.com.br"
        ),
        false
      )
    }
  })

  test("reduz ainda mais o consumo diário após Gupy e Sólides nativas", () => {
    const consultas =
      gerarConsultasBuscaVagas(
        criarPerfil()
      )

    const diarias = consultas.filter(
      consulta =>
        consulta.recorrencia === "diaria"
    )

    const custoMaximoDiario =
      diarias.reduce(
        (total, consulta) =>
          total +
          consulta.paginasMaximas,
        0
      )

    assert.ok(
      custoMaximoDiario <= 10
    )

    assert.equal(
      consultas.some(
        consulta =>
          consulta.plataforma ===
          "gupy" ||
          consulta.plataforma ===
          "solides"
      ),
      false
    )
  })

  test("gera termos brasileiros para a coleta nativa da Sólides", () => {
    const termos =
      gerarTermosBuscaNativaSolides(
        criarPerfil()
      )

    assert.ok(
      termos.includes(
        "Analista de Suporte"
      )
    )

    assert.ok(
      termos.includes(
        "Analista de Sistemas"
      )
    )

    assert.ok(
      termos.includes(
        "Analista de Infraestrutura"
      )
    )

    assert.ok(
      termos.includes(
        "Analista de Implantação"
      )
    )

    assert.ok(
      termos.includes(
        "Analista de Processos"
      )
    )

    assert.ok(
      termos.includes(
        "Analista de Dados"
      )
    )

    assert.ok(
      termos.length <= 20
    )

    const indicePortugues =
      termos.indexOf(
        "Analista de Suporte"
      )

    const indiceIngles =
      termos.indexOf(
        "Technical Support"
      )

    assert.ok(
      indicePortugues >= 0
    )

    assert.ok(
      indiceIngles >= 0
    )

    assert.ok(
      indicePortugues <
      indiceIngles
    )
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

  test("mantém Vagas.com, InfoJobs e Catho no grupo brasileiro", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const portaisBr = consultas.filter(consulta => consulta.plataforma === "portais-br")

    assert.ok(portaisBr.length > 0)

    const texto = portaisBr.map(consulta => consulta.texto).join("\n")

    assert.ok(texto.includes("site:vagas.com.br"))

    assert.ok(texto.includes("site:infojobs.com.br"))

    assert.ok(texto.includes("site:catho.com.br"))
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

  test("inclui todos os cargos do perfil em alguma estratégia", () => {
    const perfil = criarPerfil()

    const consultas = gerarConsultasBuscaVagas(perfil)

    const textoWeb = consultas.map(consulta => consulta.texto.toLowerCase()).join("\n")

    const termosGupy = gerarTermosBuscaNativaGupy(perfil)
      .map(termo => termo.toLowerCase())
      .join("\n")

    const textoCompleto = `${textoWeb}\n${termosGupy}`

    for (const cargo of [...perfil.cargosPrincipais, ...perfil.cargosRelacionados]) {
      assert.ok(
        textoCompleto.includes(cargo.toLowerCase()),
        `Cargo ausente das estratégias: ${cargo}`
      )
    }
  })

  test("não usa cargos de desvio na descoberta", () => {
    const perfil = criarPerfil()

    const consultas = gerarConsultasBuscaVagas(perfil)

    const termosGupy = gerarTermosBuscaNativaGupy(perfil)

    const texto = [
      ...consultas.map(consulta => consulta.texto),
      ...termosGupy
    ]
      .join("\n")
      .toLowerCase()

    assert.equal(texto.includes("software developer"), false)
  })

  test("não gera consultas Brave duplicadas", () => {
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

  test("mantém consultas Brave dentro de limites seguros", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    for (const consulta of consultas) {
      assert.ok(consulta.texto.length <= 400, `Consulta longa demais: ${consulta.texto}`)

      const palavras = consulta.texto.trim().split(/\s+/).length

      assert.ok(palavras <= 50, `Consulta com palavras demais: ${consulta.texto}`)

      assert.ok(consulta.paginasMaximas >= 1 && consulta.paginasMaximas <= 2)
    }
  })
})