import assert from "node:assert/strict"

import {
  afterEach,
  describe,
  mock,
  test
} from "node:test"

import { collectSolidesJobs } from "../src/collectors/solides.js"

import type { PerfilProfissional } from "../src/types/perfil-profissional.js"

function criarPerfil(): PerfilProfissional {
  return {
    resumoProfissional: "",

    cargosPrincipais: [
      "Analista de Suporte",
      "Technical Support"
    ],

    cargosRelacionados: [
      "Analista de Sistemas",
      "Application Support"
    ],

    cargosDesvio: [
      "Software Developer"
    ],

    competencias: [],

    experiencias: [],

    formacoes: [],

    cursos: [],

    localizacoesAceitas: [
      "Brasil",
      "Brazil"
    ],

    titulosExcluidos: []
  }
}

function respostaHtml(
  html: string,
  status = 200
) {
  return new Response(html, {
    status,

    headers: {
      "Content-Type": "text/html"
    }
  })
}

function htmlDetalhe(
  id: string,
  titulo: string,
  empresa: string,
  localizacao: string,
  remoto = false
) {
  return `
    <!doctype html>
    <html>
      <body>
        <h1>${titulo}</h1>

        <div>${empresa}</div>

        <button>Quero me candidatar</button>

        <div>${localizacao}</div>

        <div>1 posição</div>

        ${remoto ? "<div>Remoto</div>" : "<div>Presencial</div>"}

        <p>
          Atendimento e suporte técnico aos usuários,
          análise de incidentes, troubleshooting,
          Windows, redes e sistemas corporativos.
        </p>

        <h2>Requisitos</h2>

        <p>
          Conhecimento em tecnologia da informação,
          suporte técnico e atendimento ao cliente.
        </p>

        <h2>Como chegar</h2>

        <p>Endereço da empresa</p>

        <div>Sólides, tudo que o RH precisa em um só lugar!</div>
      </body>
    </html>
  `
}

afterEach(() => {
  mock.restoreAll()
})

describe("coletor nativo da Sólides", () => {
  test("pesquisa os cargos individualmente e extrai as vagas", async () => {
    const termosConsultados: string[] = []

    mock.method(
      globalThis,
      "fetch",
      async (
        input: Parameters<typeof fetch>[0]
      ) => {
        const url = new URL(
          input instanceof Request
            ? input.url
            : String(input)
        )

        if (url.pathname === "/vagas") {
          const termo =
            url.searchParams.get("title") ?? ""

          termosConsultados.push(termo)

          if (
            termo === "Analista de Suporte" &&
            url.searchParams.get("page") === "1"
          ) {
            return respostaHtml(`
              <html>
                <body>
                  <a href="/vaga/101/analista-de-suporte">
                    <h2>Analista de Suporte</h2>
                  </a>

                  <a href="/vaga/102/analista-de-suporte-n2">
                    <h2>Analista de Suporte N2</h2>
                  </a>
                </body>
              </html>
            `)
          }

          return respostaHtml(
            "<html><body></body></html>"
          )
        }

        if (
          url.pathname.includes("/vaga/101/")
        ) {
          return respostaHtml(
            htmlDetalhe(
              "101",
              "Analista de Suporte",
              "Empresa A",
              "João Pessoa - PB",
              false
            )
          )
        }

        if (
          url.pathname.includes("/vaga/102/")
        ) {
          return respostaHtml(
            htmlDetalhe(
              "102",
              "Analista de Suporte N2",
              "Empresa B",
              "São Paulo - SP",
              true
            )
          )
        }

        return respostaHtml(
          "<html><body></body></html>",
          404
        )
      }
    )

    const coleta =
      await collectSolidesJobs(
        100,
        criarPerfil()
      )

    assert.equal(
      coleta.source,
      "solides"
    )

    assert.equal(
      coleta.jobs.length,
      2
    )

    assert.ok(
      termosConsultados.includes(
        "Analista de Suporte"
      )
    )

    assert.ok(
      termosConsultados.includes(
        "Technical Support"
      )
    )

    assert.ok(
      termosConsultados.includes(
        "Analista de Sistemas"
      )
    )

    for (
      const termo of termosConsultados
    ) {
      assert.equal(
        termo.includes(" OR "),
        false
      )
    }
  })

  test("normaliza empresa localização descrição e modalidade", async () => {
    mock.method(
      globalThis,
      "fetch",
      async (
        input: Parameters<typeof fetch>[0]
      ) => {
        const url = new URL(
          input instanceof Request
            ? input.url
            : String(input)
        )

        if (url.pathname === "/vagas") {
          const termo =
            url.searchParams.get("title")

          if (
            termo === "Analista de Suporte"
          ) {
            return respostaHtml(`
              <html>
                <body>
                  <a href="/vaga/777/analista-de-suporte">
                    Analista de Suporte
                  </a>
                </body>
              </html>
            `)
          }

          return respostaHtml(
            "<html><body></body></html>"
          )
        }

        if (
          url.pathname.includes("/vaga/777/")
        ) {
          return respostaHtml(
            htmlDetalhe(
              "777",
              "Analista de Suporte N2",
              "Tech Brasil",
              "Recife - PE",
              true
            )
          )
        }

        return respostaHtml(
          "<html><body></body></html>",
          404
        )
      }
    )

    const coleta =
      await collectSolidesJobs(
        100,
        criarPerfil()
      )

    assert.equal(
      coleta.jobs.length,
      1
    )

    const vaga = coleta.jobs[0]

    assert.ok(vaga)

    assert.equal(
      vaga.externalId,
      "777"
    )

    assert.equal(
      vaga.company,
      "Tech Brasil"
    )

    assert.equal(
      vaga.title,
      "Analista de Suporte N2"
    )

    assert.equal(
      vaga.location,
      "Recife - PE"
    )

    assert.equal(
      vaga.remote,
      true
    )

    assert.ok(
      vaga.description.includes(
        "troubleshooting"
      )
    )
  })

  test("deduplica a mesma vaga encontrada por cargos diferentes", async () => {
    let detalhesConsultados = 0

    mock.method(
      globalThis,
      "fetch",
      async (
        input: Parameters<typeof fetch>[0]
      ) => {
        const url = new URL(
          input instanceof Request
            ? input.url
            : String(input)
        )

        if (url.pathname === "/vagas") {
          if (
            url.searchParams.get("page") === "1"
          ) {
            return respostaHtml(`
              <html>
                <body>
                  <a href="/vaga/999/analista-de-suporte">
                    Analista de Suporte
                  </a>
                </body>
              </html>
            `)
          }

          return respostaHtml(
            "<html><body></body></html>"
          )
        }

        if (
          url.pathname.includes("/vaga/999/")
        ) {
          detalhesConsultados++

          return respostaHtml(
            htmlDetalhe(
              "999",
              "Analista de Suporte",
              "Empresa Única",
              "Curitiba - PR"
            )
          )
        }

        return respostaHtml(
          "<html><body></body></html>",
          404
        )
      }
    )

    const coleta =
      await collectSolidesJobs(
        100,
        criarPerfil()
      )

    assert.equal(
      coleta.jobs.length,
      1
    )

    assert.equal(
      coleta.jobs[0]?.externalId,
      "999"
    )

    assert.equal(
      detalhesConsultados,
      1
    )
  })

  test("falha em uma vaga não interrompe as demais", async () => {
    mock.method(
      globalThis,
      "fetch",
      async (
        input: Parameters<typeof fetch>[0]
      ) => {
        const url = new URL(
          input instanceof Request
            ? input.url
            : String(input)
        )

        if (url.pathname === "/vagas") {
          if (
            url.searchParams.get("title") ===
            "Analista de Suporte"
          ) {
            return respostaHtml(`
              <html>
                <body>
                  <a href="/vaga/1/vaga-com-erro">
                    Vaga com erro
                  </a>

                  <a href="/vaga/2/analista-de-suporte">
                    Analista de Suporte
                  </a>
                </body>
              </html>
            `)
          }

          return respostaHtml(
            "<html><body></body></html>"
          )
        }

        if (
          url.pathname.includes("/vaga/1/")
        ) {
          return respostaHtml(
            "<html><body>Erro</body></html>",
            500
          )
        }

        if (
          url.pathname.includes("/vaga/2/")
        ) {
          return respostaHtml(
            htmlDetalhe(
              "2",
              "Analista de Suporte",
              "Empresa B",
              "Goiânia - GO"
            )
          )
        }

        return respostaHtml(
          "<html><body></body></html>",
          404
        )
      }
    )

    const coleta =
      await collectSolidesJobs(
        100,
        criarPerfil()
      )

    assert.equal(
      coleta.jobs.length,
      1
    )

    assert.equal(
      coleta.jobs[0]?.externalId,
      "2"
    )
  })
})