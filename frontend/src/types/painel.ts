export type StatusVaga = "relevant" | "viewed" | "applied" | "ignored"

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

/**
 * O painel inicial mostra somente oportunidades que ainda exigem ação.
 *
 * Aplicadas e ignoradas continuam disponíveis separadamente no histórico.
 */
export type FiltroStatus = "abertas" | StatusVaga

export type FiltroModalidade = "todas" | "remota" | "nao-remota"

export type OrdenacaoVagas = "compatibilidade" | "recentes"

export type StatusSincronizacao = {
  data: string

  limiteDiario: number

  chamadasHoje: number

  chamadasRestantes: number

  limiteMensal: number

  chamadasMes: number

  chamadasRestantesMes: number

  consultasConfiguradas: number

  consultasEmCache: number

  consultasAtivas: number

  ultimaAtualizacao: string | null
}

export type ModoSincronizacao = {
  braveAutorizada: boolean

  limiteBrave: number
}

export type ResultadoFonteSincronizacao = {
  source: string

  /**
   * Total bruto devolvido pela API ou pelo board ATS.
   */
  found: number

  /**
   * Total que passou pelo filtro profissional antes da persistência.
   */
  matched: number

  inserted: number

  duplicates: number

  error?: string
}

export type ResultadoPersistenciaDescoberta = {
  novas: number

  atualizadas: number

  falhas: number
}

export type ResultadoFonteWeb = {
  provedor: string

  encontradas: number

  vagasValidas: number

  compativeisBrasil: number

  incompativeisBrasil: number

  indefinidas: number

  importadas: number

  duplicadas: number

  semDadosObrigatorios: number

  falhas: number

  ignoradas: number
}

export type PaginaSomenteDescoberta = {
  provedor: string

  titulo: string

  url: string

  descricao: string | null

  consulta: string
}

export type ResultadoWebSincronizacao = {
  paginasDescobertas: number

  descartadasPorTitulo: number

  paginasDeListagem: number

  paginasSelecionadas: number

  paginasSomenteDescoberta: number

  vagasExtraidas: number

  compativeisBrasil: number

  incompativeisBrasil: number

  indefinidas: number

  importadas: number

  duplicadas: number

  semDadosObrigatorios: number

  falhas: number

  persistenciaDescoberta: ResultadoPersistenciaDescoberta

  porProvedor: ResultadoFonteWeb[]

  somenteDescoberta: PaginaSomenteDescoberta[]
}

export type ResultadoAnaliseSincronizacao = {
  analisadas: number

  relevantes: number

  descartadas: number
}

export type ResultadoSincronizacao = {
  modo: ModoSincronizacao

  fontes: ResultadoFonteSincronizacao[]

  web: ResultadoWebSincronizacao

  analise: ResultadoAnaliseSincronizacao
}
