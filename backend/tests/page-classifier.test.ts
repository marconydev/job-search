import assert from "node:assert/strict"

import { describe, test } from "node:test"

import { identificarProvedorPagina } from "../src/discovery/page-classifier.js"

describe("classificação de páginas de vagas", () => {
  test("reconhece vaga em portal de empresa da Gupy", () => {
    assert.equal(identificarProvedorPagina("https://gaudium.gupy.io/jobs/12064824"), "gupy")
  })

  test("reconhece portal central da Gupy", () => {
    assert.equal(identificarProvedorPagina("https://portal.gupy.io/job-search"), "gupy")
  })

  test("reconhece vaga no portal central da Sólides", () => {
    assert.equal(
      identificarProvedorPagina("https://vagas.solides.com.br/vaga/834737/analista-de-suporte"),
      "solides"
    )
  })

  test("reconhece portal próprio de empresa na Sólides", () => {
    assert.equal(
      identificarProvedorPagina("https://empresa.vagas.solides.com.br/vaga/834737"),
      "solides"
    )
  })

  test("não confunde site desconhecido com plataforma conhecida", () => {
    assert.equal(identificarProvedorPagina("https://example.com/jobs/123"), "desconhecido")
  })
})
