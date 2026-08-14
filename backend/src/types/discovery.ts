/**
 * Identifico as plataformas que consigo reconhecer diretamente pela URL.
 *
 * Mantenho os nomes comerciais das plataformas como são conhecidos
 * publicamente e uso português apenas nos valores que pertencem ao projeto.
 */
export type ProvedorPagina =
  | "gupy"
  | "linkedin"
  | "lever"
  | "greenhouse"
  | "workable"
  | "smartrecruiters"
  | "indeed"
  | "remote-ok"
  | "remotive"
  | "pagina-propria"
  | "agregador"
  | "desconhecido"

/**
 * Represento uma página encontrada durante a busca na internet.
 *
 * Ainda não considero este resultado uma vaga válida. Primeiro preciso
 * identificar a origem e depois confirmar o conteúdo da página.
 */
export type PaginaDescoberta = {
  origem: string
  consulta: string
  titulo: string
  url: string
  descricao: string | null
}

/**
 * Acrescento o provedor identificado sem perder as informações
 * originalmente encontradas durante a pesquisa.
 */
export type PaginaClassificada = PaginaDescoberta & {
  provedor: ProvedorPagina
}

/**
 * Represento o resultado bruto devolvido por um mecanismo de busca.
 */
export type ResultadoDescobertaWeb = {
  provedor: string
  paginas: PaginaDescoberta[]
}
