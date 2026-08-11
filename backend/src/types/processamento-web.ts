import type {
  ProvedorPagina
} from "./discovery.js"

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

export type ResultadoProcessamentoWeb = {
  paginasDescobertas: number
  paginasSelecionadas: number
  vagasExtraidas: number
  compativeisBrasil: number
  incompativeisBrasil: number
  indefinidas: number
  importadas: number
  duplicadas: number
  semDadosObrigatorios: number
  falhas: number
  porProvedor: ResultadoFonteProcessada[]
}