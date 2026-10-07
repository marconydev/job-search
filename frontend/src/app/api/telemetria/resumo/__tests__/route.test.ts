import { beforeEach, describe, expect, test, vi } from "vitest"

import { GET, sanitizarDias } from "@/app/api/telemetria/resumo/route"

import { requisitarBackend } from "@/lib/api-servidor"

vi.mock("@/lib/api-servidor", () => ({
  requisitarBackend: vi.fn()
}))

const requisitarMock = vi.mocked(requisitarBackend)

function respostaFalsa(body: unknown, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  })
}

function req(query = ""): Request {
  return new Request(`http://localhost/api/telemetria/resumo${query}`)
}

beforeEach(() => {
  requisitarMock.mockReset()
})

describe("sanitizarDias", () => {
  test("default 7 para vazio, nulo ou NaN", () => {
    expect(sanitizarDias(null)).toBe(7)
    expect(sanitizarDias(undefined)).toBe(7)
    expect(sanitizarDias("")).toBe(7)
    expect(sanitizarDias("abc")).toBe(7)
  })

  test("rejeita zero e negativos", () => {
    expect(sanitizarDias("0")).toBe(7)
    expect(sanitizarDias("-1")).toBe(7)
  })

  test("aplica teto 30", () => {
    expect(sanitizarDias("31")).toBe(30)
    expect(sanitizarDias("99999")).toBe(30)
  })

  test("trunca float", () => {
    expect(sanitizarDias("9.9")).toBe(9)
  })

  test("aceita valores validos", () => {
    expect(sanitizarDias("7")).toBe(7)
    expect(sanitizarDias("14")).toBe(14)
    expect(sanitizarDias("30")).toBe(30)
  })
})

describe("GET /api/telemetria/resumo", () => {
  test("200 com corpo propagado", async () => {
    requisitarMock.mockResolvedValueOnce(
      respostaFalsa({ janelaDias: 7, serieDiaria: [], topDescartes: [], ultimaExecucao: null })
    )

    const r = await GET(req())
    expect(r.status).toBe(200)

    const body = await r.json()
    expect(body.janelaDias).toBe(7)
  })

  test("repassa dias=14 para o backend", async () => {
    requisitarMock.mockResolvedValueOnce(respostaFalsa({ janelaDias: 14 }))

    await GET(req("?dias=14"))

    expect(requisitarMock).toHaveBeenCalledWith(
      "/jobs/telemetria/resumo?dias=14",
      expect.objectContaining({ cache: "no-store" })
    )
  })

  test("clampa dias=45 para 30 na URL do backend", async () => {
    requisitarMock.mockResolvedValueOnce(respostaFalsa({}))

    await GET(req("?dias=45"))

    expect(requisitarMock).toHaveBeenCalledWith(
      "/jobs/telemetria/resumo?dias=30",
      expect.anything()
    )
  })

  test("string maliciosa cai no default 7", async () => {
    requisitarMock.mockResolvedValueOnce(respostaFalsa({}))

    await GET(req("?dias=" + encodeURIComponent("1;DROP TABLE funil_telemetria;--")))

    expect(requisitarMock).toHaveBeenCalledWith(
      "/jobs/telemetria/resumo?dias=7",
      expect.anything()
    )
  })

  test("propaga status 500 do backend com mensagem generica", async () => {
    requisitarMock.mockResolvedValueOnce(respostaFalsa({ message: "boom" }, 500))

    const r = await GET(req())
    expect(r.status).toBe(500)

    const body = await r.json()
    expect(body.mensagem).toBe("boom")
  })

  test("503 quando o backend nao responde", async () => {
    requisitarMock.mockRejectedValueOnce(new Error("rede caiu"))

    const r = await GET(req())
    expect(r.status).toBe(503)

    const body = await r.json()
    expect(body.mensagem).toBe("Nao foi possivel acessar o backend.")
  })

  test("corpo vazio do backend nao explode o parser", async () => {
    requisitarMock.mockResolvedValueOnce(new Response("", { status: 200 }))

    const r = await GET(req())
    expect(r.status).toBe(200)

    const body = await r.json()
    expect(body).toEqual({})
  })
})
