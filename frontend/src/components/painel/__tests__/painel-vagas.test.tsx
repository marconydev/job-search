import { render, screen } from "@testing-library/react"

import userEvent from "@testing-library/user-event"

import { beforeEach, describe, expect, test, vi } from "vitest"

import { PainelVagas } from "@/components/painel/painel-vagas"

import type { DadosPainel } from "@/types/painel"

import type { ResumoTelemetria } from "@/types/telemetria"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}))

vi.mock("@/components/painel/controle-sincronizacao", () => ({
  ControleSincronizacao: () => <div data-testid="controle-sync">controle</div>
}))

vi.mock("@/components/painel/cartao-vaga", () => ({
  CartaoVaga: () => <div data-testid="cartao-vaga">card</div>
}))

vi.mock("@/components/painel/detalhe-vaga", () => ({
  DetalheVaga: () => <div data-testid="detalhe-vaga">detalhe</div>
}))

const dadosVazios: DadosPainel = {
  resumo: {
    novas: 0,
    vistas: 0,
    aplicadas: 0,
    ignoradas: 0,
    novas_hoje: 0,
    parciais: 0,
    total: 0,
    pontuacao_media: 0
  },
  total: 0,
  vagas: []
}

const resumo: ResumoTelemetria = {
  ultimaExecucao: {
    execucaoId: "abcdefgh-0000-0000-0000-000000000000",
    finalizadaEm: "2026-10-07T12:00:00.000Z",
    funil: {
      coletadas: 10,
      aposJanela: 9,
      aposElegibilidade: 8,
      aposMatcher: 5,
      importadas: 3,
      duplicadas: 1
    },
    porFonte: [],
    erros: []
  },
  serieDiaria: [],
  topDescartes: [],
  janelaDias: 7
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn())
})

describe("PainelVagas — integracao do painel de telemetria", () => {
  test("botao Ver Telemetria aparece abaixo do ControleSincronizacao", () => {
    render(<PainelVagas dadosIniciais={dadosVazios} resumoTelemetriaInicial={resumo} />)

    expect(screen.getByTestId("controle-sync")).toBeInTheDocument()
    expect(screen.getByText("Ver Telemetria")).toBeInTheDocument()
  })

  test("clicar em Ver Telemetria abre o painel na pagina", async () => {
    const user = userEvent.setup()
    render(<PainelVagas dadosIniciais={dadosVazios} resumoTelemetriaInicial={resumo} />)

    await user.click(screen.getByText("Ver Telemetria"))

    expect(screen.getByText("Ocultar Telemetria")).toBeInTheDocument()
    expect(screen.getByText("Ultima execucao")).toBeInTheDocument()
  })

  test("clicar de novo colapsa o painel", async () => {
    const user = userEvent.setup()
    render(<PainelVagas dadosIniciais={dadosVazios} resumoTelemetriaInicial={resumo} />)

    await user.click(screen.getByText("Ver Telemetria"))
    await user.click(screen.getByText("Ocultar Telemetria"))

    expect(screen.queryByText("Ultima execucao")).not.toBeInTheDocument()
  })

  test("passar resumo null nao quebra a pagina", async () => {
    const user = userEvent.setup()
    render(<PainelVagas dadosIniciais={dadosVazios} resumoTelemetriaInicial={null} />)

    await user.click(screen.getByText("Ver Telemetria"))

    expect(screen.getByText("Nenhuma execucao registrada ainda.")).toBeInTheDocument()
  })
})
