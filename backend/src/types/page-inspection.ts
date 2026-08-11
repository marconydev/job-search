import type {
  PaginaClassificada,
  ProvedorPagina
} from "./discovery.js"

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
 * Registro o resultado da inspeção de uma página encontrada na busca.
 *
 * Só considero a página como uma publicação de vaga quando encontro
 * evidência suficiente no conteúdo analisado.
 */
export type InspecaoPagina = {
  pagina: PaginaClassificada
  urlFinal: string
  provedor: ProvedorPagina
  codigoStatus: number
  ehPublicacaoVaga: boolean
  vaga: VagaExtraida | null
}

/**
 * Uso este formato quando não consigo acessar ou analisar uma página.
 *
 * Dessa forma registro a falha sem interromper a inspeção das demais
 * oportunidades encontradas.
 */
export type FalhaInspecaoPagina = {
  pagina: PaginaClassificada
  erro: string
}

export type ResultadoInspecaoPagina =
  | InspecaoPagina
  | FalhaInspecaoPagina