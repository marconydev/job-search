export type ProvedorFonteAts =
  | "greenhouse"
  | "lever"
  | "workable"
  | "recruitee"
  | "ashby"
  | "inhire"

export type NovaFonteAts = {
  provedor: ProvedorFonteAts

  identificador: string

  variante: string

  urlOrigem: string
}

export type FonteAts = {
  id: string

  provedor: ProvedorFonteAts

  identificador: string

  variante: string

  urlOrigem: string

  ativa: boolean

  descobertaEm: string

  ultimaVistaEm: string

  ultimaColetaEm: string | null

  falhasConsecutivas: number

  ultimoErro: string | null

  /**
   * Quantas vagas aderentes a última coleta entregou.
   *
   * Opcional para não quebrar mocks antigos de teste; o repositório
   * sempre preenche quando vem do banco.
   */
  ultimosAderentes?: number

  /**
   * Coletas seguidas sem nenhuma vaga aderente.
   *
   * Usado para empurrar boards improdutivos para o fim da fila sem
   * removê-los definitivamente.
   */
  coletasSemAderentes?: number
}
