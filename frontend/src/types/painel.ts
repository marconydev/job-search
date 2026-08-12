export type StatusVaga =
  | "relevant"
  | "viewed"
  | "applied"
  | "ignored"

export type ResumoPainel = {
  novas: number

  vistas: number

  aplicadas: number

  ignoradas: number

  novas_hoje: number

  parciais: number

  total: number

  pontuacao_media: number
}

export type VagaPainel = {
  id: number

  source: string

  external_id: string

  company: string

  title: string

  description: string

  location: string | null

  remote: boolean

  url: string

  published_at: string | null

  partial: boolean

  created_at: string

  local_score: number

  matched_skills: string[]

  reasons: string[]

  status: StatusVaga

  analyzed_at: string

  status_updated_at: string

  viewed_at: string | null

  applied_at: string | null
}

export type DadosPainel = {
  resumo: ResumoPainel

  total: number

  vagas: VagaPainel[]
}

export type FiltroStatus =
  | "todos"
  | StatusVaga

export type FiltroModalidade =
  | "todas"
  | "remota"
  | "nao-remota"

export type OrdenacaoVagas =
  | "compatibilidade"
  | "recentes"