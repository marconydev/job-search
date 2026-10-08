type SituacaoLocalizacao = "compativel" | "incompativel" | "indefinida"

export type ResultadoElegibilidadeLocalizacao = {
  situacao: SituacaoLocalizacao
  motivo: string
  /**
   * true quando a modalidade foi inferida por heurística (ex.: cidade
   * brasileira específica sem campo estruturado e sem sinal explícito).
   * Usado para contar `localizacaoInferida` em separado na telemetria.
   */
  inferida?: boolean
}
