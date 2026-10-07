import type { JanelaDias, MotivoDescarte, PontoSerieDiaria, ResumoTelemetria } from "@/types/telemetria"

const NOMES_MOTIVOS: Record<string, string> = {
  foraDaJanela: "Fora da janela de 21 dias",
  localizacaoIncompativel: "Localizacao incompativel",
  tituloForaFoco: "Titulo fora do foco",
  matcherAbaixoDoMinimo: "Score abaixo do minimo",
  scoreZero: "Faixa de score: zero",
  score1a39: "Faixa de score: 1-39",
  score40a49: "Faixa de score: 40-49",
  score50a59: "Faixa de score: 50-59"
}

export function formatarMotivoDescarte(motivo: string): string {
  if (typeof motivo !== "string" || motivo === "") return "(desconhecido)"
  return NOMES_MOTIVOS[motivo] ?? motivo
}

export function formatarNumero(valor: number): string {
  if (!Number.isFinite(valor)) return "0"
  return new Intl.NumberFormat("pt-BR").format(valor)
}

export function calcularPercentual(parcial: number, total: number): number {
  if (!Number.isFinite(parcial) || !Number.isFinite(total)) return 0
  if (total <= 0) return 0
  const p = (parcial / total) * 100
  return Math.max(0, Math.min(100, Math.round(p)))
}

export function maiorTotalDescartes(descartes: MotivoDescarte[]): number {
  if (!Array.isArray(descartes) || descartes.length === 0) return 0
  let max = 0
  for (const d of descartes) {
    if (d && Number.isFinite(d.total) && d.total > max) max = d.total
  }
  return max
}

export function calcularLarguraBarra(valor: number, maximo: number): number {
  if (!Number.isFinite(valor) || !Number.isFinite(maximo)) return 0
  if (maximo <= 0 || valor <= 0) return 0
  const p = (valor / maximo) * 100
  return Math.max(2, Math.min(100, Math.round(p)))
}

export function maiorColetaSerie(serie: PontoSerieDiaria[]): number {
  if (!Array.isArray(serie) || serie.length === 0) return 0
  let max = 0
  for (const p of serie) {
    if (p && Number.isFinite(p.coletadas) && p.coletadas > max) max = p.coletadas
  }
  return max
}

export function calcularAlturaBarraSerie(valor: number, maximo: number): number {
  if (!Number.isFinite(valor) || !Number.isFinite(maximo)) return 0
  if (maximo <= 0 || valor <= 0) return 0
  const p = (valor / maximo) * 100
  return Math.max(4, Math.min(100, Math.round(p)))
}

export function totalDescartes(topDescartes: MotivoDescarte[]): number {
  if (!Array.isArray(topDescartes)) return 0
  let soma = 0
  for (const d of topDescartes) {
    if (d && Number.isFinite(d.total)) soma += d.total
  }
  return soma
}

export function formatarDiaCurto(dia: string): string {
  if (typeof dia !== "string") return String(dia)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return dia
  const partes = dia.split("-")
  return partes[2] + "/" + partes[1]
}

export function resumoVazio(janela: number): ResumoTelemetria {
  return {
    ultimaExecucao: null,
    serieDiaria: [],
    topDescartes: [],
    janelaDias: janela
  }
}

export function normalizarJanela(valor: number | string | null | undefined): JanelaDias {
  const n = Math.floor(Number(valor))
  if (n === 14) return 14
  if (n === 30) return 30
  return 7
}

export function validarResumo(valor: unknown): ResumoTelemetria | null {
  if (!valor || typeof valor !== "object") return null
  const v = valor as Record<string, unknown>
  if (!Array.isArray(v.serieDiaria)) return null
  if (!Array.isArray(v.topDescartes)) return null
  const janela = Number.isFinite(Number(v.janelaDias)) ? Number(v.janelaDias) : 7
  return {
    ultimaExecucao: (v.ultimaExecucao as ResumoTelemetria["ultimaExecucao"]) ?? null,
    serieDiaria: v.serieDiaria as ResumoTelemetria["serieDiaria"],
    topDescartes: v.topDescartes as ResumoTelemetria["topDescartes"],
    janelaDias: janela
  }
}
