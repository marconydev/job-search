import { render, screen, waitFor } from "@testing-library/react"

import userEvent from "@testing-library/user-event"

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { Telemetria } from "@/components/painel/telemetria"

import type { ResumoTelemetria } from "@/types/telemetria"

const resumoBase: ResumoTelemetria = {
  ultimaExecucao: {
    execucaoId: "abcdefgh-1234-5678-9abc-def012345678",
    finalizadaEm: "2026-10-07T12:00:00.000Z",
    funil: {
      coletadas: 120,
      aposJanela: 100,
      aposElegibilidade: 80,
      aposMatcher: 45,
      importadas: 30,
      duplicadas: 5
    },
    porFonte: [],
    erros: []
  },
  serieDiaria: [
    { dia: "2026-10-06", coletadas: 50, importadas: 10, syncs: 1 },
    { dia: "2026-10-07", coletadas: 70, importadas: 20, syncs: 1 }
  ],
  topDescartes: [
    { motivo: "foraDaJanela", total: 20 },
    { motivo: "matcherAbaixoDoMinimo", total: 35 }
  ],
  janelaDias: 7
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("<Telemetria /> — painel retratil", () => {
  test("abre fechado por padrao", () => {
    render(<Telemetria resumoInicial={resumoBase} />)

    expect(screen.getByText("Ver Telemetria")).toBeInTheDocument()
    expect(screen.queryByText("Ultima execucao")).not.toBeInTheDocument()
  })

  test("clicar em Ver Telemetria expande o painel", async () => {
    const user = userEvent.setup()
    render(<Telemetria resumoInicial={resumoBase} />)

    await user.click(screen.getByText("Ver Telemetria"))

    expect(screen.getByText("Ocultar Telemetria")).toBeInTheDocument()
    expect(screen.getByText("Ultima execucao")).toBeInTheDocument()
  })

  test("clicar em Ocultar Telemetria colapsa de novo", async () => {
    const user = userEvent.setup()
    render(<Telemetria resumoInicial={resumoBase} />)

    await user.click(screen.getByText("Ver Telemetria"))
    await user.click(screen.getByText("Ocultar Telemetria"))

    expect(screen.getByText("Ver Telemetria")).toBeInTheDocument()
    expect(screen.queryByText("Ultima execucao")).not.toBeInTheDocument()
  })
})

describe("<Telemetria /> — exibicao de dados", () => {
  test("numeros do funil aparecem corretamente", async () => {
    const user = userEvent.setup()
    render(<Telemetria resumoInicial={resumoBase} />)
    await user.click(screen.getByText("Ver Telemetria"))

    expect(screen.getByText("120")).toBeInTheDocument()
    expect(screen.getByText("30")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  test("motivos de descarte sao traduzidos", async () => {
    const user = userEvent.setup()
    render(<Telemetria resumoInicial={resumoBase} />)
    await user.click(screen.getByText("Ver Telemetria"))

    expect(screen.getByText(/Fora da janela/)).toBeInTheDocument()
    expect(screen.getByText(/Score abaixo do minimo/)).toBeInTheDocument()
  })

  test("sugere estado vazio quando nao ha execucao", async () => {
    const user = userEvent.setup()
    render(<Telemetria resumoInicial={null} />)
    await user.click(screen.getByText("Ver Telemetria"))

    expect(screen.getByText("Nenhuma execucao registrada ainda.")).toBeInTheDocument()
  })
})

describe("<Telemetria /> — botoes de janela e atualizacao", () => {
  test("clicar em 14d faz fetch com ?dias=14", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...resumoBase, janelaDias: 14 }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const user = userEvent.setup()
    render(<Telemetria resumoInicial={resumoBase} />)

    await user.click(screen.getByText("Ver Telemetria"))
    await user.click(screen.getByText("14d"))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/telemetria/resumo?dias=14",
        expect.objectContaining({ cache: "no-store" })
      )
    })
  })

  test("clicar em Atualizar refaz fetch com a janela atual", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(resumoBase), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const user = userEvent.setup()
    render(<Telemetria resumoInicial={resumoBase} />)

    await user.click(screen.getByText("Ver Telemetria"))
    await user.click(screen.getByText("Atualizar"))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/telemetria/resumo?dias=7",
        expect.anything()
      )
    })
  })

  test("erro HTTP exibe mensagem em alerta", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ mensagem: "falha no backend" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const user = userEvent.setup()
    render(<Telemetria resumoInicial={resumoBase} />)

    await user.click(screen.getByText("Ver Telemetria"))
    await user.click(screen.getByText("Atualizar"))

    expect(await screen.findByRole("alert")).toHaveTextContent("falha no backend")
  })

  test("erro de rede cai em mensagem generica", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("rede caiu"))
    vi.stubGlobal("fetch", fetchMock)

    const user = userEvent.setup()
    render(<Telemetria resumoInicial={resumoBase} />)

    await user.click(screen.getByText("Ver Telemetria"))
    await user.click(screen.getByText("Atualizar"))

    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent("rede caiu")
  })
})
