import assert from "node:assert/strict"

import { describe, test } from "node:test"

import { db } from "../src/database/connection.js"

import {
  agregarLinhas,
  resumirTelemetria
} from "../src/repositories/funil-telemetria-repository.js"

import { getTelemetriaResumo, sanitizarDias } from "../src/routes/jobs.js"

type Linha = Parameters<typeof agregarLinhas>[0][number]

type RespostaQuery = { rows: unknown[] }

type ImplQuery = (sql: string, params?: unknown[]) => Promise<RespostaQuery>

/**
 * Substitui temporariamente db.query por uma implementacao de teste.
 *
 * O db e um singleton do modulo de conexao; mutar o metodo no objeto
 * afeta todas as chamadas dentro da janela do teste. O finally
 * restaura a referencia original mesmo em caso de falha.
 */
async function comMockQuery<T>(impl: ImplQuery, fn: () => Promise<T>): Promise<T> {
  const alvo = db as unknown as { query: ImplQuery }
  const original = alvo.query
  alvo.query = impl
  try {
    return await fn()
  } finally {
    alvo.query = original
  }
}

function linha(over: Partial<Linha>): Linha {
  return {
    fonte: "gupy",
    coletadas: 0,
    apos_janela: 0,
    apos_elegibilidade: 0,
    apos_matcher: 0,
    importadas: 0,
    duplicadas: 0,
    descartes: {},
    erros: [],
    duracao_ms: null,
    created_at: "2026-10-07T10:00:00Z",
    ...over
  }
}

describe("agregarLinhas", () => {
  test("devolve zeros quando nao ha linhas", () => {
    const r = agregarLinhas([])
    assert.deepEqual(r.funil, {
      coletadas: 0,
      aposJanela: 0,
      aposElegibilidade: 0,
      aposMatcher: 0,
      importadas: 0,
      duplicadas: 0
    })
    assert.deepEqual(r.porFonte, [])
    assert.deepEqual(r.descartes, {})
    assert.deepEqual(r.erros, [])
  })

  test("soma os campos entre fontes", () => {
    const r = agregarLinhas([
      linha({ fonte: "gupy", coletadas: 10, apos_janela: 8, apos_elegibilidade: 6, apos_matcher: 4, importadas: 3, duplicadas: 1, duracao_ms: 100 }),
      linha({ fonte: "solides", coletadas: 5, apos_janela: 5, apos_elegibilidade: 4, apos_matcher: 2, importadas: 2, duplicadas: 0, duracao_ms: 80 })
    ])
    assert.equal(r.funil.coletadas, 15)
    assert.equal(r.funil.aposJanela, 13)
    assert.equal(r.funil.aposElegibilidade, 10)
    assert.equal(r.funil.aposMatcher, 6)
    assert.equal(r.funil.importadas, 5)
    assert.equal(r.funil.duplicadas, 1)
    assert.equal(r.porFonte.length, 2)
    assert.equal(r.porFonte[0].fonte, "gupy")
    assert.equal(r.porFonte[0].duracaoMs, 100)
  })

  test("soma descartes por chave entre fontes", () => {
    const r = agregarLinhas([
      linha({ descartes: { foraDaJanela: 2, localizacaoIncompativel: 1 } }),
      linha({ descartes: { foraDaJanela: 3, matcherAbaixoDoMinimo: 4 } })
    ])
    assert.equal(r.descartes.foraDaJanela, 5)
    assert.equal(r.descartes.localizacaoIncompativel, 1)
    assert.equal(r.descartes.matcherAbaixoDoMinimo, 4)
  })

  test("ignora descartes com valor nao numerico", () => {
    const r = agregarLinhas([
      linha({ descartes: { a: "x" as unknown as number, b: 2 } })
    ])
    assert.equal(r.descartes.a, undefined)
    assert.equal(r.descartes.b, 2)
  })

  test("concatena erros e descarta entradas vazias", () => {
    const r = agregarLinhas([
      linha({ erros: ["falha A", ""] }),
      linha({ erros: ["falha B"] })
    ])
    assert.deepEqual(r.erros, ["falha A", "falha B"])
  })

  test("tolera descartes ausente e erros nulo", () => {
    const r = agregarLinhas([
      linha({ descartes: undefined as unknown as Record<string, number>, erros: null as unknown as string[] })
    ])
    assert.deepEqual(r.descartes, {})
    assert.deepEqual(r.erros, [])
  })
})

describe("sanitizarDias", () => {
  test("default 7 quando ausente, nulo ou NaN", () => {
    assert.equal(sanitizarDias(undefined), 7)
    assert.equal(sanitizarDias(null), 7)
    assert.equal(sanitizarDias("abc"), 7)
    assert.equal(sanitizarDias(""), 7)
  })

  test("rejeita zero e negativos", () => {
    assert.equal(sanitizarDias(0), 7)
    assert.equal(sanitizarDias(-1), 7)
    assert.equal(sanitizarDias("-5"), 7)
  })

  test("aplica teto 30", () => {
    assert.equal(sanitizarDias(99999), 30)
    assert.equal(sanitizarDias("31"), 30)
  })

  test("trunca float", () => {
    assert.equal(sanitizarDias(3.7), 3)
    assert.equal(sanitizarDias("9.9"), 9)
  })

  test("aceita valores validos", () => {
    assert.equal(sanitizarDias(1), 1)
    assert.equal(sanitizarDias(7), 7)
    assert.equal(sanitizarDias("15"), 15)
    assert.equal(sanitizarDias(30), 30)
  })

  test("trata string maliciosa como default", () => {
    assert.equal(sanitizarDias("1;DROP TABLE funil_telemetria;--"), 7)
  })
})

describe("resumirTelemetria", () => {
  test("tabela vazia devolve ultimaExecucao null e listas vazias", async () => {
    await comMockQuery(async () => ({ rows: [] }), async () => {
      const r = await resumirTelemetria(7)
      assert.equal(r.ultimaExecucao, null)
      assert.deepEqual(r.serieDiaria, [])
      assert.deepEqual(r.topDescartes, [])
      assert.equal(r.janelaDias, 7)
    })
  })

  test("agrega uma execucao com varias fontes e ordena descartes", async () => {
    const respostas: RespostaQuery[] = [
      { rows: [{ execucao_id: "uuid-1" }] },
      {
        rows: [
          linha({ fonte: "gupy", coletadas: 10, apos_janela: 8, apos_elegibilidade: 6, apos_matcher: 4, importadas: 3, duplicadas: 1, descartes: { foraDaJanela: 2, localizacaoIncompativel: 2 }, duracao_ms: 100, created_at: "2026-10-07T10:00:00Z" }),
          linha({ fonte: "solides", coletadas: 5, apos_janela: 5, apos_elegibilidade: 4, apos_matcher: 2, importadas: 2, duplicadas: 0, descartes: { matcherAbaixoDoMinimo: 2 }, erros: ["aviso"], duracao_ms: 80, created_at: "2026-10-07T10:01:00Z" })
        ]
      },
      {
        rows: [
          { dia: "2026-10-06", coletadas: 20, importadas: 5, syncs: 1 },
          { dia: "2026-10-07", coletadas: 15, importadas: 5, syncs: 2 }
        ]
      }
    ]
    let chamada = 0
    await comMockQuery(async () => respostas[chamada++] ?? { rows: [] }, async () => {
      const r = await resumirTelemetria(7)
      assert.equal(r.ultimaExecucao?.execucaoId, "uuid-1")
      assert.equal(r.ultimaExecucao?.funil.coletadas, 15)
      assert.equal(r.ultimaExecucao?.funil.importadas, 5)
      assert.equal(r.ultimaExecucao?.porFonte.length, 2)
      assert.deepEqual(r.ultimaExecucao?.erros, ["aviso"])
      assert.equal(r.ultimaExecucao?.finalizadaEm, "2026-10-07T10:01:00.000Z")
      assert.equal(r.topDescartes.length, 3)
      assert.equal(r.topDescartes[0].motivo, "foraDaJanela")
      assert.equal(r.topDescartes[0].total, 2)
      assert.equal(r.serieDiaria.length, 2)
      assert.equal(r.serieDiaria[0].dia, "2026-10-06")
    })
  })

  test("descarta motivos com total zero", async () => {
    let chamada = 0
    await comMockQuery(async () => {
      chamada++
      if (chamada === 1) return { rows: [{ execucao_id: "u" }] }
      if (chamada === 2) return { rows: [linha({ descartes: { a: 0, b: 3 } })] }
      return { rows: [] }
    }, async () => {
      const r = await resumirTelemetria(7)
      assert.equal(r.topDescartes.length, 1)
      assert.equal(r.topDescartes[0].motivo, "b")
    })
  })

  test("empate de descartes ordena por motivo asc", async () => {
    let chamada = 0
    await comMockQuery(async () => {
      chamada++
      if (chamada === 1) return { rows: [{ execucao_id: "u" }] }
      if (chamada === 2) return { rows: [linha({ descartes: { zzz: 5, aaa: 5 } })] }
      return { rows: [] }
    }, async () => {
      const r = await resumirTelemetria(7)
      assert.equal(r.topDescartes[0].motivo, "aaa")
      assert.equal(r.topDescartes[1].motivo, "zzz")
    })
  })

  test("propaga erro do banco", async () => {
    await comMockQuery(async () => { throw new Error("boom") }, async () => {
      await assert.rejects(() => resumirTelemetria(7), /boom/)
    })
  })
})

describe("getTelemetriaResumo", () => {
  test("200 com resumo da ultima execucao", async () => {
    await comMockQuery(async () => ({ rows: [] }), async () => {
      const req = { query: {} } as unknown as Parameters<typeof getTelemetriaResumo>[0]
      let body: unknown = null
      const res = {
        status() { return this },
        json(b: unknown) { body = b; return this }
      } as unknown as Parameters<typeof getTelemetriaResumo>[1]
      await getTelemetriaResumo(req, res)
      assert.ok(body && typeof body === "object")
      assert.equal((body as { janelaDias: number }).janelaDias, 7)
      assert.equal((body as { ultimaExecucao: unknown }).ultimaExecucao, null)
    })
  })

  test("respeita ?dias valido e repassa para a query", async () => {
    const paramsCapturados: unknown[][] = []
    let chamada = 0
    await comMockQuery(async (_sql, params) => {
      if (params) paramsCapturados.push(params)
      chamada++
      if (chamada === 1) return { rows: [] }
      return { rows: [] }
    }, async () => {
      const req = { query: { dias: "15" } } as unknown as Parameters<typeof getTelemetriaResumo>[0]
      let body: unknown = null
      const res = {
        status() { return this },
        json(b: unknown) { body = b; return this }
      } as unknown as Parameters<typeof getTelemetriaResumo>[1]
      await getTelemetriaResumo(req, res)
      assert.equal((body as { janelaDias: number }).janelaDias, 15)
      assert.deepEqual(paramsCapturados[0], [15])
    })
  })

  test("dias invalido cai no default 7 e a query recebe 7", async () => {
    const paramsCapturados: unknown[][] = []
    let chamada = 0
    await comMockQuery(async (_sql, params) => {
      if (params) paramsCapturados.push(params)
      chamada++
      if (chamada === 1) return { rows: [] }
      return { rows: [] }
    }, async () => {
      const req = { query: { dias: "1;DROP TABLE funil_telemetria;--" } } as unknown as Parameters<typeof getTelemetriaResumo>[0]
      let body: unknown = null
      const res = {
        status() { return this },
        json(b: unknown) { body = b; return this }
      } as unknown as Parameters<typeof getTelemetriaResumo>[1]
      await getTelemetriaResumo(req, res)
      assert.equal((body as { janelaDias: number }).janelaDias, 7)
      assert.deepEqual(paramsCapturados[0], [7])
    })
  })

  test("erro do repositorio devolve 500 com mensagem generica", async () => {
    await comMockQuery(async () => { throw new Error("boom") }, async () => {
      const req = { query: {} } as unknown as Parameters<typeof getTelemetriaResumo>[0]
      let statusCode = 0
      let body: unknown = null
      const res = {
        status(c: number) { statusCode = c; return this },
        json(b: unknown) { body = b; return this }
      } as unknown as Parameters<typeof getTelemetriaResumo>[1]
      await getTelemetriaResumo(req, res)
      assert.equal(statusCode, 500)
      assert.deepEqual(body, { message: "Nao foi possivel consultar o resumo da telemetria" })
    })
  })
})
