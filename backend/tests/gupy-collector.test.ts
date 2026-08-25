import assert from "node:assert/strict"

import { afterEach, describe, mock, test } from "node:test"

import { collectGupyJobs } from "../src/collectors/gupy.js"

import type { PerfilProfissional } from "../src/types/perfil-profissional.js"

function criarPerfil(): PerfilProfissional {
  return {
    resumoProfissional: "",

    /**
     * Mantenho cargos em inglês no perfil de propósito.
     *
     * O teste precisa garantir que eles podem existir no perfil
     * sem serem enviados para a busca nativa.
     */
    cargosPrincipais: ["Analista de Suporte", "Technical Support"],

    cargosRelacionados: ["Analista de Sistemas", "Application Support"],

    cargosDesvio: ["Software Developer"],

    competencias: [],

    experiencias: [],

    formacoes: [],

    cursos: [],

    localizacoesAceitas: ["Brasil", "Brazil"],

    titulosExcluidos: []
  }
}

function respostaJson(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,

    headers: {
      "Content-Type": "application/json"
    }
  })
}

afterEach(() => {
  mock.restoreAll()
})

describe("coletor nativo da Gupy", () => {
  test("pesquisa cargos brasileiros individualmente no portal", async () => {
    const termosConsultados: string[] = []

    mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0]) => {
      const url = new URL(input instanceof Request ? input.url : String(input))

      const termo = url.searchParams.get("jobName") ?? ""

      termosConsultados.push(termo)

      if (termo === "Analista de Suporte") {
        return respostaJson({
          data: [
            {
              id: 1001,

              name: "Analista de Suporte Júnior",

              careerPageName: "Empresa Teste",

              description: "<p>Suporte técnico a usuários e sistemas.</p>",

              city: "São Paulo",

              state: "São Paulo",

              country: "Brasil",

              workplaceType: "hybrid",

              jobUrl: "https://empresa-teste.gupy.io/jobs/1001",

              publishedDate: "2026-08-19T10:00:00.000Z"
            }
          ]
        })
      }

      return respostaJson({
        data: []
      })
    })

    const coleta = await collectGupyJobs(100, criarPerfil())

    assert.equal(coleta.source, "gupy")

    assert.equal(coleta.jobs.length, 1)

    assert.ok(termosConsultados.includes("Analista de Suporte"))

    assert.ok(termosConsultados.includes("Analista de Sistemas"))

    /**
     * Os cargos ingleses podem existir no perfil,
     * mas não devem mais virar consultas.
     */
    assert.equal(termosConsultados.includes("Technical Support"), false)

    assert.equal(termosConsultados.includes("Application Support"), false)

    /**
     * Cada cargo precisa ir no parâmetro
     * jobName separadamente.
     */
    for (const termo of termosConsultados) {
      assert.equal(termo.includes(" OR "), false)
    }
  })

  test("normaliza os principais campos retornados pela Gupy", async () => {
    mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0]) => {
      const url = new URL(input instanceof Request ? input.url : String(input))

      const termo = url.searchParams.get("jobName")

      if (termo !== "Analista de Suporte") {
        return respostaJson({
          data: []
        })
      }

      return respostaJson({
        data: [
          {
            id: "abc123",

            name: "Analista de Suporte N2",

            careerPageName: "Tech Brasil",

            description:
              "<p>Atendimento de chamados.</p><p>Windows Server, redes e troubleshooting.</p>",

            city: "João Pessoa",

            state: "Paraíba",

            country: "Brasil",

            workplaceType: "remote",

            isRemoteWork: true,

            jobUrl: "https://techbrasil.gupy.io/jobs/abc123",

            publishedDate: "2026-08-18"
          }
        ]
      })
    })

    const coleta = await collectGupyJobs(100, criarPerfil())

    const vaga = coleta.jobs[0]

    assert.ok(vaga)

    assert.equal(vaga.source, "gupy")

    assert.equal(vaga.externalId, "abc123")

    assert.equal(vaga.company, "Tech Brasil")

    assert.equal(vaga.title, "Analista de Suporte N2")

    assert.equal(vaga.location, "João Pessoa, Paraíba, Brasil")

    assert.equal(vaga.remote, true)

    assert.equal(vaga.url, "https://techbrasil.gupy.io/jobs/abc123")

    assert.equal(vaga.partial, false)

    assert.ok(vaga.description.includes("Atendimento de chamados."))

    assert.ok(vaga.description.includes("Windows Server"))
  })

  test("workplaceType on-site prevalece sobre descrição e campo remoto legado", async () => {
    mock.method(globalThis, "fetch", async () =>
      respostaJson({
        data: [
          {
            id: 777,

            name: "Analista de Suporte",

            careerPageName: "Empresa Única",

            description:
              "Atendimento remoto e presencial, suporte técnico, acesso remoto, redes e Windows.",

            city: "Governador Valadares",

            state: "Minas Gerais",

            country: "Brasil",

            workplaceType: "on-site",

            isRemoteWork: true,

            jobUrl: "https://empresa-unica.gupy.io/jobs/777",

            publishedDate: "2026-08-17"
          }
        ]
      })
    )

    const coleta = await collectGupyJobs(100, criarPerfil())

    assert.equal(coleta.jobs.length, 1)

    assert.equal(coleta.jobs[0]?.externalId, "777")

    assert.equal(coleta.jobs[0]?.remote, false)
  })

  test("remove duplicidades encontradas por termos diferentes", async () => {
    mock.method(globalThis, "fetch", async () =>
      respostaJson({
        data: [
          {
            id: 888,

            name: "Analista de Suporte",

            careerPageName: "Empresa Única",

            description: "Suporte técnico, redes, Windows e atendimento ao usuário.",

            city: "João Pessoa",

            state: "Paraíba",

            country: "Brasil",

            workplaceType: "on-site",

            jobUrl: "https://empresa-unica.gupy.io/jobs/888",

            publishedDate: "2026-08-17"
          }
        ]
      })
    )

    const coleta = await collectGupyJobs(100, criarPerfil())

    assert.equal(coleta.jobs.length, 1)

    assert.equal(coleta.jobs[0]?.externalId, "888")
  })

  test("falha de um termo não impede a coleta dos demais", async () => {
    const termosConsultados: string[] = []

    mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0]) => {
      const url = new URL(input instanceof Request ? input.url : String(input))

      const termo = url.searchParams.get("jobName") ?? ""

      termosConsultados.push(termo)

      /**
       * O primeiro cargo falha.
       */
      if (termo === "Analista de Suporte") {
        return respostaJson(
          {
            erro: "indisponível"
          },
          500
        )
      }

      /**
       * O próximo cargo brasileiro
       * continua sendo consultado.
       */
      if (termo === "Analista de Sistemas") {
        return respostaJson({
          data: [
            {
              id: 9001,

              name: "Analista de Sistemas",

              careerPageName: "Empresa B",

              description: "Atuação com suporte de sistemas, SQL e atendimento a usuários.",

              city: "João Pessoa",

              state: "Paraíba",

              country: "Brasil",

              workplaceType: "remote",

              jobUrl: "https://empresa-b.gupy.io/jobs/9001",

              publishedDate: "2026-08-19"
            }
          ]
        })
      }

      return respostaJson({
        data: []
      })
    })

    const coleta = await collectGupyJobs(100, criarPerfil())

    assert.ok(termosConsultados.includes("Analista de Suporte"))

    assert.ok(termosConsultados.includes("Analista de Sistemas"))

    assert.equal(termosConsultados.includes("Technical Support"), false)

    assert.equal(coleta.jobs.length, 1)

    assert.equal(coleta.jobs[0]?.externalId, "9001")

    assert.equal(coleta.jobs[0]?.title, "Analista de Sistemas")
  })
})
