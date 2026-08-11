/**
 * Identifico aqui as plataformas que consigo reconhecer diretamente
 * pela URL encontrada durante a descoberta.
 *
 * Uso "pagina-propria" apenas quando eu conseguir confirmar que a
 * oportunidade pertence ao site oficial da empresa.
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
  | "career-page"
  | "aggregator"
  | "unknown"

/**
 * Represento uma página encontrada durante a busca na internet.
 *
 * Ainda não considero esse resultado uma vaga válida. Primeiro preciso
 * identificar a origem e depois confirmar o conteúdo da página.
 */
export type PaginaDescoberta = {
  source: string
  query: string
  title: string
  url: string
  description: string | null
}

/**
 * Acrescento a origem identificada sem perder os dados retornados
 * originalmente pela busca.
 */
export type PaginaClassificada = PaginaDescoberta & {
  provider: ProvedorPagina
}

/**
 * Represento o resultado bruto devolvido pelo mecanismo de busca.
 */
export type ResultadoDescobertaWeb = {
  provider: string
  pages: PaginaDescoberta[]
}

/**
 * Mantenho estes aliases temporariamente enquanto migro os arquivos
 * existentes para os nomes em português.
 *
 * Depois que toda a aplicação estiver usando os novos nomes, removo
 * esta camada de compatibilidade.
 */
export type PageProvider = ProvedorPagina
export type DiscoveredPage = PaginaDescoberta
export type ClassifiedPage = PaginaClassificada
export type WebDiscoveryResult = ResultadoDescobertaWeb