export type ProvedorFonteAts = "greenhouse" | "lever" | "workable" | "recruitee" | "ashby"

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
}
