export type CompetenciaPerfil = {
  nome: string

  termos: string[]
}

export type ExperienciaProfissional = {
  empresa: string

  cargo: string

  periodo: string

  descricao: string
}

export type FormacaoProfissional = {
  instituicao: string

  curso: string

  nivel: string

  periodo: string
}

export type CursoProfissional = {
  nome: string

  instituicao: string

  ano: string
}

export type PerfilProfissional = {
  resumoProfissional: string

  cargosPrincipais: string[]

  cargosRelacionados: string[]

  cargosDesvio: string[]

  competencias: CompetenciaPerfil[]

  experiencias: ExperienciaProfissional[]

  formacoes: FormacaoProfissional[]

  cursos: CursoProfissional[]

  localizacoesAceitas: string[]

  titulosExcluidos: string[]
}

export type PerfilProfissionalComMetadados = {
  perfil: PerfilProfissional

  nomeArquivoOrigem: string | null

  atualizadoEm: string | null
}
