import type {
  CompetenciaPerfil,
  CursoProfissional,
  ExperienciaProfissional,
  FormacaoProfissional
} from "./perfil-profissional.js"

export type SugestoesCurriculo = {
  resumoProfissional:
    string

  competencias:
    CompetenciaPerfil[]

  experiencias:
    ExperienciaProfissional[]

  formacoes:
    FormacaoProfissional[]

  cursos:
    CursoProfissional[]
}

export type ResultadoImportacaoCurriculo = {
  arquivo: {
    nome:
      string

    tipo:
      string

    tamanho:
      number
  }

  textoExtraido:
    string

  sugestoes:
    SugestoesCurriculo

  avisos:
    string[]
}