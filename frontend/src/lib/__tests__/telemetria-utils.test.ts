import { describe, expect, test } from "vitest"

import {
  calcularAlturaBarraSerie,
  calcularLarguraBarra,
  calcularPercentual,
  formatarDiaCurto,
  formatarMotivoDescarte,
  formatarNumero,
  maiorColetaSerie,
  maiorTotalDescartes,
  normalizarJanela,
  resumoVazio,
  totalDescartes,
  validarResumo
} from "@/lib/telemetria-utils"

describe("formatarMotivoDescarte", () => {
  test("traduz chaves conhecidas", () => {
    expect(formatarMotivoDescarte("foraDaJanela")).toContain("21 dias")
    expect(formatarMotivoDescarte("localizacaoIncompativel")).toContain("Localizacao")
    expect(formatarMotivoDescarte("matcherAbaixoDoMinimo")).toContain("Score")
  })

  test("chave desconhecida volta como veio", () => {
    expect(formatarMotivoDescarte("motivo-novo")).toBe("motivo-novo")
  })

  test("string vazia vira placeholder", () => {
    expect(formatarMotivoDescarte("")).toBe("(desconhecido)")
  })
})

describe("formatarNumero", () => {
  test("formata em pt-BR", () => {
    expect(formatarNumero(1234)).toBe("1.234")
  })

  test("protege contra NaN e Infinity", () => {
    expect(formatarNumero(Number.NaN)).toBe("0")
    expect(formatarNumero(Number.POSITIVE_INFINITY)).toBe("0")
  })
})

describe("calcularPercentual", () => {
  test("calcula e arredonda", () => {
    expect(calcularPercentual(25, 100)).toBe(25)
    expect(calcularPercentual(1, 3)).toBe(33)
  })

  test("teto em 100", () => {
    expect(calcularPercentual(200, 100)).toBe(100)
  })

  test("zera com total 0 ou invalido", () => {
    expect(calcularPercentual(10, 0)).toBe(0)
    expect(calcularPercentual(10, Number.NaN)).toBe(0)
    expect(calcularPercentual(Number.NaN, 100)).toBe(0)
  })
})

describe("maiorTotalDescartes", () => {
  test("lista vazia devolve 0", () => {
    expect(maiorTotalDescartes([])).toBe(0)
  })

  test("devolve o maior total", () => {
    expect(maiorTotalDescartes([{ motivo: "a", total: 2 }, { motivo: "b", total: 9 }])).toBe(9)
  })
})

describe("calcularLarguraBarra", () => {
  test("proporcional ao maximo", () => {
    expect(calcularLarguraBarra(5, 10)).toBe(50)
    expect(calcularLarguraBarra(10, 10)).toBe(100)
  })

  test("minimo visivel quando valor positivo", () => {
    expect(calcularLarguraBarra(1, 1000)).toBeGreaterThanOrEqual(2)
  })

  test("zero quando valor invalido ou nulo", () => {
    expect(calcularLarguraBarra(0, 10)).toBe(0)
    expect(calcularLarguraBarra(-5, 10)).toBe(0)
    expect(calcularLarguraBarra(5, 0)).toBe(0)
  })
})

describe("maiorColetaSerie", () => {
  test("lista vazia devolve 0", () => {
    expect(maiorColetaSerie([])).toBe(0)
  })

  test("retorna a maior coleta", () => {
    expect(
      maiorColetaSerie([
        { dia: "2026-10-01", coletadas: 3, importadas: 1, syncs: 1 },
        { dia: "2026-10-02", coletadas: 12, importadas: 2, syncs: 1 }
      ])
    ).toBe(12)
  })
})

describe("calcularAlturaBarraSerie", () => {
  test("proporcional", () => {
    expect(calcularAlturaBarraSerie(10, 10)).toBe(100)
    expect(calcularAlturaBarraSerie(5, 10)).toBe(50)
  })

  test("minimo visivel quando valor positivo", () => {
    expect(calcularAlturaBarraSerie(1, 1000)).toBeGreaterThanOrEqual(4)
  })

  test("zero com valor invalido ou maximo zero", () => {
    expect(calcularAlturaBarraSerie(0, 10)).toBe(0)
    expect(calcularAlturaBarraSerie(5, 0)).toBe(0)
  })
})

describe("totalDescartes", () => {
  test("soma os totais", () => {
    expect(totalDescartes([{ motivo: "a", total: 3 }, { motivo: "b", total: 7 }])).toBe(10)
  })

  test("protege contra entrada invalida", () => {
    expect(totalDescartes([] as never)).toBe(0)
  })
})

describe("formatarDiaCurto", () => {
  test("converte ISO em dd/mm", () => {
    expect(formatarDiaCurto("2026-10-07")).toBe("07/10")
  })

  test("devolve como veio se nao for ISO", () => {
    expect(formatarDiaCurto("hoje")).toBe("hoje")
  })
})

describe("resumoVazio", () => {
  test("estrutura vazia valida", () => {
    const r = resumoVazio(7)
    expect(r.ultimaExecucao).toBeNull()
    expect(r.serieDiaria).toEqual([])
    expect(r.topDescartes).toEqual([])
    expect(r.janelaDias).toBe(7)
  })
})

describe("normalizarJanela", () => {
  test("aceita 7, 14 e 30", () => {
    expect(normalizarJanela(7)).toBe(7)
    expect(normalizarJanela(14)).toBe(14)
    expect(normalizarJanela(30)).toBe(30)
  })

  test("cai no default 7 para qualquer outro valor", () => {
    expect(normalizarJanela(0)).toBe(7)
    expect(normalizarJanela(99)).toBe(7)
    expect(normalizarJanela("abc")).toBe(7)
    expect(normalizarJanela(null)).toBe(7)
  })
})

describe("validarResumo", () => {
  test("rejeita entrada nao-objeto", () => {
    expect(validarResumo(null)).toBeNull()
    expect(validarResumo("x")).toBeNull()
    expect(validarResumo(42)).toBeNull()
  })

  test("rejeita objeto sem arrays", () => {
    expect(validarResumo({ serieDiaria: null, topDescartes: [] })).toBeNull()
    expect(validarResumo({ serieDiaria: [], topDescartes: null })).toBeNull()
  })

  test("aceita shape valido", () => {
    const r = validarResumo({
      ultimaExecucao: null,
      serieDiaria: [{ dia: "2026-10-07", coletadas: 5, importadas: 2, syncs: 1 }],
      topDescartes: [{ motivo: "x", total: 3 }],
      janelaDias: 14
    })
    expect(r?.janelaDias).toBe(14)
    expect(r?.serieDiaria.length).toBe(1)
  })
})
