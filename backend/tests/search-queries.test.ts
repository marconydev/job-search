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
  test("gera apenas termos brasileiros na coleta nativa da Gupy", () => {
    const termos = gerarTermosBuscaNativaGupy(criarPerfil())

    assert.ok(termos.includes("Analista de Suporte"))

    assert.ok(termos.includes("Analista de Suporte Técnico"))

    assert.ok(termos.includes("Suporte Técnico"))

    assert.ok(termos.includes("Analista de Sistemas"))

    assert.ok(termos.includes("Analista de Infraestrutura"))

    assert.ok(termos.includes("Analista NOC"))

    assert.ok(termos.includes("Analista de Implantação"))

    assert.ok(termos.includes("Analista de Processos"))

    assert.ok(termos.includes("Analista de Dados"))

    assert.equal(termos.includes("Technical Support"), false)

    assert.equal(termos.includes("Application Support"), false)

    assert.equal(termos.includes("NOC Analyst"), false)

    assert.equal(termos.includes("Customer Onboarding"), false)

    assert.equal(termos.includes("BI Analyst"), false)

    assert.equal(termos.includes("Software Developer"), false)

    assert.ok(termos.length <= 30)
  })

  test("gera apenas termos brasileiros na coleta nativa da Sólides", () => {
    const termos = gerarTermosBuscaNativaSolides(criarPerfil())

    assert.ok(termos.includes("Analista de Suporte"))

    assert.ok(termos.includes("Analista de Sistemas"))

    assert.ok(termos.includes("Analista de Infraestrutura"))

    assert.ok(termos.includes("Analista de Implantação"))

    assert.ok(termos.includes("Analista de Processos"))

    assert.ok(termos.includes("Analista de Dados"))

    assert.equal(termos.includes("Technical Support"), false)

    assert.equal(termos.includes("Application Support"), false)

    assert.equal(termos.includes("NOC Analyst"), false)

    assert.equal(termos.includes("Customer Onboarding"), false)

    assert.equal(termos.includes("BI Analyst"), false)

    assert.ok(termos.length <= 20)
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
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const solides = consultas.filter(consulta => consulta.plataforma === "solides")

    assert.equal(solides.length, 0)

    for (const consulta of consultas) {
      assert.equal(consulta.texto.includes("site:vagas.solides.com.br"), false)
    }
  })

  test("não usa mais Brave direcionado ao Vagas.com", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    for (const consulta of consultas) {
      assert.equal(
        consulta.texto.includes("site:vagas.com.br"),
        false,
        `Consulta ainda direcionada ao Vagas.com: ${consulta.texto}`
      )
    }
  })

  test("não envia nomes de cargos em inglês para a Brave", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const texto = consultas.map(consulta => consulta.texto.toLowerCase()).join("\n")

    const termosInglesProibidos = [
      "technical support",
      "application support",
      "noc analyst",
      "customer onboarding",
      "onboarding specialist",
      "business process analyst",
      "bpm analyst",
      "data analyst",
      "bi analyst",
      "business intelligence analyst",
      "power bi analyst",
      "software developer"
    ]

    for (const termo of termosInglesProibidos) {
      assert.equal(texto.includes(termo), false, `Cargo inglês presente na busca: ${termo}`)
    }
  })

  test("usa Brasil como contexto de localização das pesquisas globais", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const globais = consultas.filter(consulta =>
      ["linkedin", "workday", "ats", "web"].includes(consulta.plataforma)
    )

    assert.ok(globais.length > 0)

    for (const consulta of globais) {
      assert.ok(consulta.texto.includes("Brasil"), `Consulta global sem Brasil: ${consulta.texto}`)
    }
  })

  test("reduz consumo diário da Brave após Gupy e Sólides nativas", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const diarias = consultas.filter(consulta => consulta.recorrencia === "diaria")

    const custoMaximoDiario = diarias.reduce(
      (total, consulta) => total + consulta.paginasMaximas,
      0
    )

    assert.ok(custoMaximoDiario <= 10)
  })

  test("mantém fontes complementares relevantes", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const plataformas = new Set(consultas.map(consulta => consulta.plataforma))

    assert.ok(plataformas.has("linkedin"))

    assert.ok(plataformas.has("indeed"))

    assert.ok(plataformas.has("workday"))

    assert.ok(plataformas.has("portais-br"))

    assert.ok(plataformas.has("agregadores-br"))

    assert.ok(plataformas.has("ats"))

    assert.ok(plataformas.has("remote-rocketship"))

    assert.ok(plataformas.has("web"))
  })

  test("mantém InfoJobs Catho e Pandapé no grupo brasileiro", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const portaisBr = consultas.filter(consulta => consulta.plataforma === "portais-br")

    assert.ok(portaisBr.length > 0)

    const texto = portaisBr.map(consulta => consulta.texto).join("\n")

    assert.equal(texto.includes("site:vagas.com.br"), false)

    assert.ok(texto.includes("site:infojobs.com.br"))

    assert.ok(texto.includes("site:catho.com.br"))

    assert.ok(texto.includes("site:pandape.infojobs.com.br"))

    assert.ok(texto.includes("site:pandape.catho.com.br"))
  })

  test("mantém os novos portais brasileiros no grupo complementar", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const agregadores = consultas.filter(consulta => consulta.plataforma === "agregadores-br")

    assert.ok(agregadores.length > 0)

    const texto = agregadores.map(consulta => consulta.texto).join("\n")

    assert.ok(texto.includes("site:99jobs.com"))

    assert.ok(texto.includes("site:empregare.com/pt-br/vaga-"))

    assert.ok(texto.includes("site:br.jooble.org/jdp"))

    assert.ok(texto.includes("site:jobatus.com.br"))

    assert.ok(texto.includes("site:glassdoor.com.br/job-listing"))

    assert.equal(texto.includes("gupy.io"), false)

    assert.equal(texto.includes("solides.com.br"), false)

    for (const consulta of agregadores) {
      assert.equal(consulta.paginasMaximas, 1)
    }
  })

  test("mantém Remote Rocketship somente como descoberta complementar", () => {
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

  test("mantém prioridades regionais sem duplicar fontes com coleta direta", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const regionais = consultas.filter(consulta => consulta.familia === "regional")

    assert.equal(regionais.length, 3)

    const texto = regionais.map(consulta => consulta.texto).join("\n")

    assert.ok(texto.includes("São Paulo"))

    assert.ok(texto.includes("Blumenau"))

    assert.ok(texto.includes("Brasília"))

    assert.equal(texto.includes("site:gupy.io"), false)

    assert.equal(texto.includes("site:vagas.com.br"), false)

    assert.ok(texto.includes("site:linkedin.com/jobs/view"))

    assert.ok(texto.includes("site:br.indeed.com/viewjob"))

    assert.ok(texto.includes("site:myworkdayjobs.com"))
  })

  test("não usa cargos de desvio na descoberta", () => {
    const perfil = criarPerfil()

    const consultas = gerarConsultasBuscaVagas(perfil)

    const termosGupy = gerarTermosBuscaNativaGupy(perfil)

    const texto = [...consultas.map(consulta => consulta.texto), ...termosGupy]
      .join("\n")
      .toLowerCase()

    assert.equal(texto.includes("software developer"), false)
  })

  test("não gera consultas Brave duplicadas", () => {
    const consultas = gerarConsultasBuscaVagas(criarPerfil())

    const unicas = new Set(consultas.map(consulta => consulta.texto))

    assert.equal(unicas.size, consultas.length)
  })

  test("não procura regiões globais", () => {
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
