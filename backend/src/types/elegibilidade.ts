export type SituacaoLocalizacao = "compativel" | "incompativel" | "indefinida"

export type ResultadoElegibilidadeLocalizacao = {
  situacao: SituacaoLocalizacao
  motivo: string
}
