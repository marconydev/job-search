import assert from "node:assert/strict"

import { mock } from "node:test"

import test from "node:test"

import { collectSolidesJobs } from "../src/collectors/solides.js"

import type { PerfilProfissional } from "../src/types/perfil-profissional.js"

function criarPerfil(): PerfilProfissional {
  return {
    resumoProfissional: "",

    cargosPrincipais: ["Analista de Suporte"],

    cargosRelacionados: ["Analista de Sistemas"],

    cargosDesvio: ["Software Developer"],

    competencias: [],

    experiencias: [],

    formacoes: [],

    cursos: [],

    localizacoesAceitas: ["Brasil"],

    titulosExcluidos: []
  }
}

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" }
  })
}

function vagaSintetica(id: number, titulo: string, cidade: string, uf: string) {
  return {
    id,

    title: titulo,

    description: `<p>Modelo: Presencial em <strong>${cidade} - ${uf}</strong></p><p>Atividades de suporte.</p>`,

    companyName: "Empresa Teste S.A.",

    redirectLink: `https://empresa-teste.solides.jobs/vacancies/${id}?origem=portal`,

    homeOffice: false,

    jobType: "presencial",

    currentState: "em_andamento",

    createdAt: "2026-10-06",

    city: { id: 1, name: cidade, state_id: 1 },

    state: { id: 1, name: "Estado", code: uf }
  }
}

test("Sólides: normaliza vaga do novo endpoint público", async (t) => {
  mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(input instanceof Request ? input.url : String(input))

    const termo = url.searchParams.get("title") ?? ""

    const pagina = Number(url.searchParams.get("page") ?? "1")

    if (termo === "Analista de Suporte" && pagina === 1) {
      return respostaJson({
        success: true,

        errors: [],

        data: {
          totalPages: 1,

          currentPage: 1,

          count: 1,

          data: [vagaSintetica(933421, "Analista de Suporte", "Goiânia", "GO")]
        }
      })
    }

    return respostaJson({
      success: true,

      errors: [],

      data: {
        totalPages: 0,

        currentPage: pagina,

        count: 0,

        data: []
      }
    })
  })

  t.after(() => mock.restoreAll())

  const coleta = await collectSolidesJobs(100, criarPerfil())

  assert.equal(coleta.source, "solides")

  assert.equal(coleta.jobs.length, 1)

  const vaga = coleta.jobs[0]!

  assert.equal(vaga.source, "solides")

  assert.equal(vaga.externalId, "933421")

  assert.equal(vaga.title, "Analista de Suporte")

  assert.equal(vaga.company, "Empresa Teste S.A.")

  assert.equal(vaga.location, "Goiânia, GO, Brasil")

  assert.equal(vaga.remote, false)

  assert.equal(
    vaga.url,
    "https://empresa-teste.solides.jobs/vacancies/933421?origem=portal"
  )

  assert.equal(vaga.partial, false)

  assert.ok(vaga.description.includes("Atividades de suporte"))

  assert.ok(vaga.description.includes("Modelo: Presencial"))
})

test("Sólides: homeOffice verdadeiro marca como remota quando jobType é vazio", async (t) => {
  mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(input instanceof Request ? input.url : String(input))

    const termo = url.searchParams.get("title") ?? ""

    if (termo === "Analista de Suporte") {
      const vaga = { ...vagaSintetica(1, "Analista de Suporte", "Remoto", "SP") }

      vaga.homeOffice = true

      vaga.jobType = ""

      return respostaJson({
        success: true,

        errors: [],

        data: { totalPages: 1, currentPage: 1, count: 1, data: [vaga] }
      })
    }

    return respostaJson({
      success: true,

      errors: [],

      data: { totalPages: 0, currentPage: 1, count: 0, data: [] }
    })
  })

  t.after(() => mock.restoreAll())

  const coleta = await collectSolidesJobs(100, criarPerfil())

  const vaga = coleta.jobs[0]!

  assert.equal(vaga.remote, true)
})

test("Sólides: termo em inglês do perfil é pesquisado no novo endpoint", async (t) => {
  const termosConsultados: string[] = []

  mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(input instanceof Request ? input.url : String(input))

    termosConsultados.push(url.searchParams.get("title") ?? "")

    return respostaJson({
      success: true,

      errors: [],

      data: { totalPages: 0, currentPage: 1, count: 0, data: [] }
    })
  })

  t.after(() => mock.restoreAll())

  await collectSolidesJobs(100, criarPerfil())

  assert.ok(termosConsultados.includes("Analista de Suporte"))

  assert.ok(termosConsultados.includes("Analista de Sistemas"))

  assert.equal(termosConsultados.includes("Software Developer"), false)
})
