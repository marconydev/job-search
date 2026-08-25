import assert from "node:assert/strict"

import { afterEach, describe, mock, test } from "node:test"

import { extrairVagaGupy } from "../src/extractors/gupy.js"

afterEach(() => {
  mock.restoreAll()
})

function paginaCarreirasIndisponivel() {
  mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response("", {
        status: 404
      })
  )
}

describe("extrator de vagas Gupy", () => {
  test("reconhece TELECOMMUTE do JSON-LD como vaga remota", async () => {
    paginaCarreirasIndisponivel()

    const html = `
          <!doctype html>
          <html>
            <head>
              <meta
                property="og:site_name"
                content="Empresa Teste"
              />

              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "JobPosting",
                  "title": "Analista de Suporte",
                  "jobLocationType": "TELECOMMUTE"
                }
              </script>
            </head>

            <body>
              <h1>Analista de Suporte</h1>

              <h2>Descrição da vaga</h2>
              <p>Atendimento e suporte aos usuários.</p>

              <h2>Responsabilidades e atribuições</h2>
              <p>Atuar com suporte técnico.</p>

              <h2>Requisitos e qualificações</h2>
              <p>Conhecimentos em redes.</p>
            </body>
          </html>
        `

    const vaga = await extrairVagaGupy(html, "https://empresa-teste.gupy.io/jobs/123")

    assert.ok(vaga)

    assert.equal(vaga.remoto, true)
  })

  test("não transforma vaga presencial em remota porque a descrição cita atendimento remoto", async () => {
    paginaCarreirasIndisponivel()

    const html = `
          <!doctype html>
          <html>
            <head>
              <meta
                property="og:site_name"
                content="Wyntech"
              />

              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "JobPosting",
                  "title": "Analista de Suporte TI Junior",
                  "jobLocationType": "ON_SITE"
                }
              </script>
            </head>

            <body>
              <h1>Analista de Suporte TI Junior</h1>

              <h2>Descrição da vaga</h2>
              <p>
                Atendimento remoto e presencial aos usuários.
              </p>

              <h2>Responsabilidades e atribuições</h2>
              <p>
                Suporte técnico e acesso remoto às estações.
              </p>

              <h2>Requisitos e qualificações</h2>
              <p>
                Conhecimentos em Windows e redes.
              </p>
            </body>
          </html>
        `

    const vaga = await extrairVagaGupy(html, "https://wyntech.gupy.io/jobs/12262214")

    assert.ok(vaga)

    assert.equal(vaga.remoto, false)
  })

  test("não presume remoto quando a página não possui modalidade estruturada", async () => {
    paginaCarreirasIndisponivel()

    const html = `
          <!doctype html>
          <html>
            <head>
              <meta
                property="og:site_name"
                content="Empresa Teste"
              />
            </head>

            <body>
              <h1>Analista de Suporte</h1>

              <h2>Descrição da vaga</h2>
              <p>
                Realização de suporte remoto a clientes.
              </p>

              <h2>Responsabilidades e atribuições</h2>
              <p>
                Acesso remoto aos computadores dos usuários.
              </p>

              <h2>Requisitos e qualificações</h2>
              <p>
                Windows, redes e troubleshooting.
              </p>
            </body>
          </html>
        `

    const vaga = await extrairVagaGupy(html, "https://empresa-teste.gupy.io/jobs/456")

    assert.ok(vaga)

    assert.equal(vaga.remoto, false)
  })
})
