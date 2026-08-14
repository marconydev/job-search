import type { PaginaClassificada, ProvedorPagina } from "./discovery.js"

import type { ResultadoElegibilidadeLocalizacao } from "./elegibilidade.js"

/**
 * Guardo aqui os dados que consigo extrair de uma publicação de vaga.
 *
 * Alguns campos podem não existir na página, então mantenho como null
 * quando não consigo confirmar a informação.
 */
export type VagaExtraida = {
  titulo: string | null
  empresa: string | null
  descricao: string | null
  localizacao: string | null
  tipoContratacao: string | null
  dataPublicacao: string | null
  validaAte: string | null
  remoto: boolean
  urlCandidatura: string | null
}

/**
 * Registro o resultado completo da inspeção de uma página.
 *
 * Quando encontro uma vaga, já devolvo também a análise geográfica
 * para não precisar recalcular essa regra em outras partes do sistema.
 */
export type InspecaoPagina = {
  pagina: PaginaClassificada
  urlFinal: string
  provedor: ProvedorPagina
  codigoStatus: number
  ehPublicacaoVaga: boolean
  vaga: VagaExtraida | null
  elegibilidadeBrasil: ResultadoElegibilidadeLocalizacao | null
}

/**
 * Uso este formato quando não consigo acessar ou analisar uma página.
 */
export type FalhaInspecaoPagina = {
  pagina: PaginaClassificada
  erro: string
}

export type ResultadoInspecaoPagina = InspecaoPagina | FalhaInspecaoPagina
