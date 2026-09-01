import assert from "node:assert/strict"

import { describe, mock, test } from "node:test"

import { coletarFonteAts } from "../src/collectors/ats.js"

import { identificarFonteAtsDaPagina } from "../src/services/fontes-ats.js"

import type { PaginaClassificada } from "../src/types/discovery.js"

import type { FonteAts } from "../src/types/fonte-ats.js"

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

function criarFonteInHire(): FonteAts {
  return {
    id: "1",

    provedor: "inhire",

    identificador: "radix",

    variante: "padrao",

    urlOrigem: "https://radix.inhire.app/vagas/123",

    ativa: true,

    descobertaEm: "2026-08-31T12:00:00.000Z",

    ultimaVistaEm: "2026-08-31T12:00:00.000Z",

    ultimaColetaEm: null,

    falhasConsecutivas: 0,

    ultimoErro: null
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

  test("identifica tenant InHire mesmo quando a página ainda está classificada como desconhecida", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        provedor: "desconhecido",

        url: "https://radix.inhire.app/vagas/b03c4672-0720-4a90-851d-a86657e21be5/analista"
      })
    )

    assert.deepEqual(fonte, {
      provedor: "inhire",

      identificador: "radix",

      variante: "padrao",

      urlOrigem:
        "https://radix.inhire.app/vagas/b03c4672-0720-4a90-851d-a86657e21be5/analista"
    })
  })

  test("não aprende endpoints de infraestrutura da InHire como tenant", () => {
    const fonte = identificarFonteAtsDaPagina(
      criarPagina({
        url: "https://api.inhire.app/job-posts/public/pages"
      })
    )

    assert.equal(fonte, null)
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

describe("coleta direta de ATS", () => {
  test("coleta InHire usando tenant e preserva modalidade estruturada", async () => {
    const chamadas: Array<{ url: string; headers: Headers }> = []

    mock.method(
      globalThis,
      "fetch",
      async (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url

        const headers = new Headers(init?.headers)

        chamadas.push({ url, headers })

        return new Response(
          JSON.stringify({
            tenantName: "Radix",

            jobsPage: [
              {
                jobId: "vaga-remota",
                displayName: "Analista de Suporte Júnior",
                workplaceType: "REMOTE",
                location: "Brasil",
                status: "Published"
              },
              {
                jobId: "vaga-hibrida",
                displayName: "Analista de Sistemas",
                workplaceType: "Hybrid",
                location: "Rio de Janeiro, RJ",
                status: "published"
              },
              {
                jobId: "rascunho",
                displayName: "Analista de Suporte",
                workplaceType: "Remote",
                location: "Brasil",
                status: "Draft"
              }
            ]
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      }
    )

    try {
      const coleta = await coletarFonteAts(criarFonteInHire(), 10)

      assert.equal(chamadas.length, 1)

      assert.equal(chamadas[0]?.url, "https://api.inhire.app/job-posts/public/pages")

      assert.equal(chamadas[0]?.headers.get("X-Tenant"), "radix")

      assert.equal(chamadas[0]?.headers.get("X-Inhire-Client"), "web-inhire")

      assert.equal(coleta.source, "ats:inhire:radix")

      assert.equal(coleta.sourceKey, "ats:inhire:padrao:radix")

      assert.equal(coleta.complete, true)

      assert.equal(coleta.jobs.length, 2)

      assert.equal(coleta.jobs[0]?.externalId, "vaga-remota")

      assert.equal(coleta.jobs[0]?.remote, true)

      assert.equal(coleta.jobs[0]?.publishedAt, null)

      assert.equal(coleta.jobs[1]?.externalId, "vaga-hibrida")

      assert.equal(coleta.jobs[1]?.remote, false)

      assert.equal(coleta.jobs.some(vaga => vaga.externalId === "rascunho"), false)
    } finally {
      mock.restoreAll()
    }
  })

  test("não trata resposta de tenant InHire inválido como board vazio", async () => {
    mock.method(globalThis, "fetch", async () => {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      })
    })

    try {
      await assert.rejects(
        () => coletarFonteAts(criarFonteInHire(), 10),
        /não retornou um tenant válido/
      )
    } finally {
      mock.restoreAll()
    }
  })
})
