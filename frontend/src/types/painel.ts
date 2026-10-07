export type StatusVaga = "relevant" | "applied" | "ignored"

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

  nova_sincronizacao: boolean

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
 * "viewed" é um filtro de acompanhamento, não um status persistido.
 */
export type FiltroStatus = "abertas" | "viewed" | StatusVaga

export type FiltroModalidade = "todas" | "remota" | "nao-remota"

export type OrdenacaoVagas = "compatibilidade" | "recentes"

type ModoSincronizacao = {
  braveAutorizada: boolean

  limiteBrave: number
}

type ResultadoFonteSincronizacao = {
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

type ResultadoPersistenciaDescoberta = {
  novas: number

  atualizadas: number

  falhas: number
}

type ResultadoFonteWeb = {
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

type PaginaSomenteDescoberta = {
  provedor: string

  titulo: string

  url: string

  descricao: string | null

  consulta: string
}

type ResultadoWebSincronizacao = {
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

type ResultadoAnaliseSincronizacao = {
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

type SituacaoExecucaoSincronizacao =
  "ociosa" | "executando" | "concluida" | "falhou" | "interrompida"

export type ModoExecucaoSincronizacao = "economico" | "brave"

export type EstadoExecucaoSincronizacao = {
  id: string | null

  estado: SituacaoExecucaoSincronizacao

  modo: ModoExecucaoSincronizacao | null

  etapa: string | null

  mensagem: string | null

  resultado: ResultadoSincronizacao | null

  iniciadoEm: string | null

  heartbeatEm: string | null

  concluidoEm: string | null
}

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

  execucao: EstadoExecucaoSincronizacao
}
