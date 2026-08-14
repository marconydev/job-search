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

/**
 * Mantenho no mesmo perfil tanto os dados utilizados pelo matcher
 * quanto informações profissionais que poderão ser utilizadas
 * posteriormente na análise inteligente das vagas.
 */
export type PerfilProfissional = {
  resumoProfissional: string

  cargosPrincipais: string[]

  cargosRelacionados: string[]

  cargosDesvio: string[]

  competencias:
    CompetenciaPerfil[]

  experiencias:
    ExperienciaProfissional[]

  formacoes:
    FormacaoProfissional[]

  cursos:
    CursoProfissional[]

  localizacoesAceitas: string[]

  titulosExcluidos: string[]
}

export type PerfilProfissionalComMetadados = {
  perfil:
    PerfilProfissional

  nomeArquivoOrigem:
    string | null

  atualizadoEm:
    string | null
}