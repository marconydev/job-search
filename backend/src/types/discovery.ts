export type ProvedorPagina =
  | "gupy"
  | "linkedin"
  | "lever"
  | "greenhouse"
  | "workable"
  | "smartrecruiters"
  | "ashby"
  | "recruitee"
  | "workday"
  | "solides"
  | "pandape"
  | "vagas"
  | "infojobs"
  | "catho"
  | "indeed"
  | "remote-ok"
  | "remotive"
  | "pagina-propria"
  | "agregador"
  | "desconhecido"

export type PaginaDescoberta = {
  origem: string

  consulta: string

  titulo: string

  url: string

  descricao: string | null
}

export type PaginaClassificada = PaginaDescoberta & {
  provedor: ProvedorPagina
}

export type ResultadoDescobertaWeb = {
  provedor: string

  paginas: PaginaDescoberta[]

  /**
   * A Brave informa quando ainda existem outras páginas para a mesma
   * consulta.
   *
   * Eu uso esse sinal para aprofundar somente as pesquisas que merecem
   * mais cobertura, sem gastar chamadas desnecessariamente.
   */
  maisResultadosDisponiveis: boolean
}
