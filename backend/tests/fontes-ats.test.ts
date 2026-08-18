import assert from "node:assert/strict"

import { describe, test } from "node:test"

import { identificarFonteAtsDaPagina } from "../src/services/fontes-ats.js"

import type { PaginaClassificada } from "../src/types/discovery.js"

function criarPagina(alteracoes: Partial<PaginaClassificada> = {}): PaginaClassificada {
  return {
    origem: "teste",

    consulta: "technical support",

    titulo: "Technical Support Analyst",

    url: "https://example.com/jobs/123",

    descricao: "Vaga de suporte técnico.",

    provedor: "desconhecido",

    ...alteracoes
  }
}

describe("aprendizado de fontes ATS", () => {
  test("identifica board Greenhouse", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "greenhouse",

        url: "https://job-boards.greenhouse.io/openai/jobs/123"
      })
    )

    assert.deepEqual(fonte, {
      provedor: "greenhouse",

      identificador: "openai",

      variante: "padrao",

      urlOrigem: "https://job-boards.greenhouse.io/openai/jobs/123"
    })
  })

  test("identifica site Lever global", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "lever",

        url: "https://jobs.lever.co/empresa/abc"
      })
    )

    assert.equal(fonte?.identificador, "empresa")

    assert.equal(fonte?.variante, "global")
  })

  test("identifica site Lever europeu", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "lever",

        url: "https://jobs.eu.lever.co/empresa/abc"
      })
    )

    assert.equal(fonte?.identificador, "empresa")

    assert.equal(fonte?.variante, "eu")
  })

  test("identifica empresa Workable no caminho da URL", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "workable",

        url: "https://apply.workable.com/minha-empresa/j/ABC123/"
      })
    )

    assert.equal(fonte?.identificador, "minha-empresa")

    assert.equal(fonte?.provedor, "workable")
  })

  test("não trata shortlink Workable como subdomínio da empresa", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "workable",

        url: "https://apply.workable.com/j/ABC123/"
      })
    )

    assert.equal(fonte, null)
  })

  test("não trata página genérica jobs Workable como conta", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "workable",

        url: "https://jobs.workable.com/view/ABC123"
      })
    )

    assert.equal(fonte, null)
  })

  test("identifica empresa usando subdomínio Workable explícito", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "workable",

        url: "https://minhaempresa.workable.com/jobs/123"
      })
    )

    assert.equal(fonte?.identificador, "minhaempresa")

    assert.equal(fonte?.provedor, "workable")
  })

  test("identifica job board Ashby", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "ashby",

        url: "https://jobs.ashbyhq.com/empresa/abc123"
      })
    )

    assert.equal(fonte?.identificador, "empresa")

    assert.equal(fonte?.provedor, "ashby")
  })

  test("decodifica identificador Ashby presente na URL", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "ashby",

        url: "https://jobs.ashbyhq.com/PAR%20Technology/abc123"
      })
    )

    assert.equal(fonte?.identificador, "PAR Technology")

    assert.equal(fonte?.provedor, "ashby")
  })

  test("não interrompe o aprendizado quando o segmento possui codificação inválida", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "ashby",

        url: "https://jobs.ashbyhq.com/empresa%ZZ/abc123"
      })
    )

    assert.equal(fonte?.identificador, "empresa%ZZ")

    assert.equal(fonte?.provedor, "ashby")
  })

  test("identifica careers site Recruitee", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "recruitee",

        url: "https://empresa.recruitee.com/o/analista-de-suporte"
      })
    )

    assert.equal(fonte?.identificador, "empresa")

    assert.equal(fonte?.provedor, "recruitee")
  })

  test("ignora plataforma sem API ATS aprendida", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "linkedin",

        url: "https://www.linkedin.com/jobs/view/123"
      })
    )

    assert.equal(fonte, null)
  })

  test("ignora URL inválida", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "lever",

        url: "url-invalida"
      })
    )

    assert.equal(fonte, null)
  })
})
