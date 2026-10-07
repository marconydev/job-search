type FunilResumo = {
  coletadas: number
  aposJanela: number
  aposElegibilidade: number
  aposMatcher: number
  importadas: number
  duplicadas: number
}

type FonteResumo = FunilResumo & {
  fonte: string
  duracaoMs: number | null
}

export type PontoSerieDiaria = {
  dia: string
  coletadas: number
  importadas: number
  syncs: number
}

export type MotivoDescarte = {
  motivo: string
  total: number
}

type UltimaExecucaoResumo = {
  execucaoId: string
  finalizadaEm: string
  funil: FunilResumo
  porFonte: FonteResumo[]
  erros: string[]
}

export type ResumoTelemetria = {
  ultimaExecucao: UltimaExecucaoResumo | null
  serieDiaria: PontoSerieDiaria[]
  topDescartes: MotivoDescarte[]
  janelaDias: number
}

export type JanelaDias = 7 | 14 | 30
