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

  test("reconhece 99Jobs e seus subdomínios", () => {
    assert.equal(
      identificarProvedorPagina("https://www.99jobs.com/empresa/jobs/504812-analista-de-suporte"),
      "99jobs"
    )

    assert.equal(
      identificarProvedorPagina("https://gruposmartfit.99jobs.com/vagas/488601-vaga"),
      "99jobs"
    )
  })

  test("reconhece Empregare e portais de empresas", () => {
    assert.equal(
      identificarProvedorPagina("https://www.empregare.com/pt-br/vaga-analista-de-suporte_158125"),
      "empregare"
    )

    assert.equal(
      identificarProvedorPagina("https://agsus.empregare.com/pt-br/vaga-tecnico_166332"),
      "empregare"
    )
  })

  test("reconhece Jooble Brasil", () => {
    assert.equal(
      identificarProvedorPagina("https://br.jooble.org/jdp/6950630080950196802"),
      "jooble"
    )
  })

  test("reconhece Jobatus Brasil", () => {
    assert.equal(identificarProvedorPagina("https://www.jobatus.com.br/vaga-exemplo"), "jobatus")
  })

  test("reconhece Glassdoor Brasil", () => {
    assert.equal(
      identificarProvedorPagina("https://www.glassdoor.com.br/job-listing/analista-de-suporte"),
      "glassdoor"
    )
  })

  test("não confunde site desconhecido com plataforma conhecida", () => {
    assert.equal(identificarProvedorPagina("https://example.com/jobs/123"), "desconhecido")
  })
})
