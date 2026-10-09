import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { ErroColetaAts, statusEhPermanente } from "../src/collectors/ats.js"

const INTERVALO_BASE_MS = 30 * 60 * 1000

type BoardSimulado = {
  id: string
  coletasSemAderentes: number
  falhasConsecutivas: number
  ultimaColetaEm: Date | null
  descobertaEm: Date
  ultimaVistaEm: Date
  produtivo: boolean
}

function nextAt(b: BoardSimulado): number {
  const base = b.ultimaColetaEm ?? b.descobertaEm
  const backoff = (1 + Math.min(b.coletasSemAderentes, 3)) * INTERVALO_BASE_MS
  return base.getTime() + backoff
}

function ordenarFila(boards: BoardSimulado[]): BoardSimulado[] {
  return [...boards].sort((a, b) => {
    if (a.falhasConsecutivas !== b.falhasConsecutivas) {
      return a.falhasConsecutivas - b.falhasConsecutivas
    }
    const na = nextAt(a)
    const nb = nextAt(b)
    if (na !== nb) return na - nb
    return b.ultimaVistaEm.getTime() - a.ultimaVistaEm.getTime()
  })
}

describe("fila ATS — regressao de inanicao", () => {
  test("9 boards em 0 + 46 em 1 + lote 8 — todos visitados em N execucoes", () => {
    const T0 = new Date("2026-10-08T12:00:00Z").getTime()
    const INTERVALO_SYNC_MS = 30 * 60 * 1000
    const LOTE = 8
    const NUM_SYNCS = 30

    const boards: BoardSimulado[] = [
      ...Array.from({ length: 9 }, (_, i) => ({
        id: `p-${i}`,
        coletasSemAderentes: 0,
        falhasConsecutivas: 0,
        ultimaColetaEm: new Date(T0),
        descobertaEm: new Date(T0),
        ultimaVistaEm: new Date(T0),
        produtivo: true
      })),
      ...Array.from({ length: 46 }, (_, i) => ({
        id: `u-${i}`,
        coletasSemAderentes: 1,
        falhasConsecutivas: 0,
        ultimaColetaEm: new Date(T0),
        descobertaEm: new Date(T0),
        ultimaVistaEm: new Date(T0),
        produtivo: false
      }))
    ]

    const visitados = new Set<string>()

    for (let sync = 0; sync < NUM_SYNCS; sync++) {
      const agora = new Date(T0 + (sync + 1) * INTERVALO_SYNC_MS)
      const fila = ordenarFila(boards)
      const lote = fila.slice(0, LOTE)

      for (const escolhido of lote) {
        visitados.add(escolhido.id)
        const idx = boards.findIndex(x => x.id === escolhido.id)
        const atual = boards[idx]
        boards[idx] = {
          ...atual,
          ultimaColetaEm: agora,
          coletasSemAderentes: atual.produtivo ? 0 : atual.coletasSemAderentes + 1
        }
      }
    }

    assert.equal(
      visitados.size,
      55,
      `esperado 55 boards distintos visitados; obtido ${visitados.size} em ${NUM_SYNCS} syncs`
    )
  })

  test("falhas_consecutivas tem prioridade sobre o backoff", () => {
    const agora = new Date("2026-10-08T15:00:00Z")
    const boards: BoardSimulado[] = [
      { id: "saudavel-improdutivo", coletasSemAderentes: 3, falhasConsecutivas: 0,
        ultimaColetaEm: agora, descobertaEm: agora, ultimaVistaEm: agora, produtivo: false },
      { id: "com-falha", coletasSemAderentes: 0, falhasConsecutivas: 2,
        ultimaColetaEm: new Date(0), descobertaEm: agora, ultimaVistaEm: agora, produtivo: false }
    ]
    const fila = ordenarFila(boards)
    assert.equal(fila[0].id, "saudavel-improdutivo")
    assert.equal(fila[1].id, "com-falha")
  })
})

describe("classificacao de erro da coleta ATS", () => {
  test("statusEhPermanente identifica 404 e 410", () => {
    assert.equal(statusEhPermanente(404), true)
    assert.equal(statusEhPermanente(410), true)
  })

  test("statusEhPermanente NAO marca 5xx, 429, timeout como permanentes", () => {
    assert.equal(statusEhPermanente(500), false)
    assert.equal(statusEhPermanente(502), false)
    assert.equal(statusEhPermanente(503), false)
    assert.equal(statusEhPermanente(429), false)
    assert.equal(statusEhPermanente(408), false)
    assert.equal(statusEhPermanente(200), false)
  })

  test("ErroColetaAts carrega a classificacao e o status", () => {
    const e1 = new ErroColetaAts("404 — board morto", true, 404)
    assert.equal(e1.permanente, true)
    assert.equal(e1.status, 404)
    assert.equal(e1.name, "ErroColetaAts")

    const e2 = new ErroColetaAts("timeout na rede", false, null)
    assert.equal(e2.permanente, false)
    assert.equal(e2.status, null)
  })
})
