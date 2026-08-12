import type {
  ProvedorPagina
} from "./discovery.js"

export type TipoPendenciaProcessamentoWeb =
  | "acesso"
  | "extracao"
  | "localizacao"
  | "indisponivel"

export type PendenciaProcessamentoWeb = {
  tipo: TipoPendenciaProcessamentoWeb

  provedor: ProvedorPagina

  titulo: string

  url: string

  localizacao: string | null

  motivo: string
}

export type PaginaSomenteDescoberta = {
  provedor: ProvedorPagina

  titulo: string

  url: string

  descricao: string | null

  consulta: string
}

export type ResultadoFonteProcessada = {
  provedor: ProvedorPagina

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

export type RecomendacaoDescoberta = {
  provedor: ProvedorPagina

  titulo: string

  url: string

  descricao: string | null

  consulta: string

  pontuacao: number

  competencias: string[]

  motivos: string[]
}

/**
 * Registro o resultado da persistência das oportunidades que foram
 * encontradas somente pela descoberta.
 *
 * "novas" representa vagas adicionadas pela primeira vez.
 *
 * "atualizadas" representa oportunidades que já existiam no banco e
 * tiveram o matcher atualizado sem perder uma decisão manual anterior.
 */
export type ResultadoPersistenciaDescoberta = {
  novas: number

  atualizadas: number

  falhas: number
}

export type ResultadoProcessamentoWeb = {
  recomendacoesDescoberta:
    RecomendacaoDescoberta[]

  paginasDescobertas: number

  /**
   * Contabilizo separadamente páginas descartadas antes da inspeção.
   *
   * Isso permite acompanhar quanto ruído a busca está produzindo sem
   * consumir requisições desnecessárias aos ATS.
   */
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

  /**
   * Informo separadamente o que aconteceu com as recomendações
   * originadas apenas da descoberta.
   */
  persistenciaDescoberta:
    ResultadoPersistenciaDescoberta

  porProvedor:
    ResultadoFonteProcessada[]

  pendencias:
    PendenciaProcessamentoWeb[]

  somenteDescoberta:
    PaginaSomenteDescoberta[]
}