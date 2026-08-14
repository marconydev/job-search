import {
  perfilBusca
} from "../config/search-profile.js"

import {
  buscarPerfilProfissionalSalvo,
  salvarPerfilProfissionalNoBanco
} from "../repositories/perfil-profissional-repository.js"

import type {
  CompetenciaPerfil,
  CursoProfissional,
  ExperienciaProfissional,
  FormacaoProfissional,
  PerfilProfissional
} from "../types/perfil-profissional.js"

function criarPerfilPadrao():
  PerfilProfissional {
  return {
    resumoProfissional:
      "",

    cargosPrincipais: [
      ...perfilBusca
        .cargosPrincipais
    ],

    cargosRelacionados: [
      ...perfilBusca
        .cargosRelacionados
    ],

    cargosDesvio: [
      ...perfilBusca
        .cargosDesvio
    ],

    competencias:
      perfilBusca
        .competencias
        .map(
          competencia => ({
            nome:
              competencia.nome,

            termos: [
              ...competencia.termos
            ]
          })
        ),

    experiencias:
      [],

    formacoes:
      [],

    cursos:
      [],

    localizacoesAceitas: [
      ...perfilBusca
        .localizacoesAceitas
    ],

    titulosExcluidos: [
      ...perfilBusca
        .titulosExcluidos
    ]
  }
}

function normalizarTexto(
  valor:
    unknown
) {
  return typeof valor ===
    "string"
    ? valor.trim()
    : ""
}

function normalizarLista(
  valor:
    unknown
) {
  if (
    !Array.isArray(
      valor
    )
  ) {
    return []
  }

  return [
    ...new Set(
      valor
        .filter(
          item =>
            typeof item ===
            "string"
        )
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean)
    )
  ]
}

function normalizarCompetencias(
  valor:
    unknown
): CompetenciaPerfil[] {
  if (
    !Array.isArray(
      valor
    )
  ) {
    return []
  }

  return valor
    .map(
      item => {
        if (
          !item ||
          typeof item !==
          "object"
        ) {
          return null
        }

        const registro =
          item as
            Record<
              string,
              unknown
            >

        const nome =
          normalizarTexto(
            registro.nome
          )

        if (!nome) {
          return null
        }

        return {
          nome,

          termos:
            normalizarLista(
              registro.termos
            )
        }
      }
    )
    .filter(
      (
        item
      ): item is
        CompetenciaPerfil =>
        item !== null
    )
}

function normalizarExperiencias(
  valor:
    unknown
): ExperienciaProfissional[] {
  if (
    !Array.isArray(
      valor
    )
  ) {
    return []
  }

  return valor
    .map(
      item => {
        if (
          !item ||
          typeof item !==
          "object"
        ) {
          return null
        }

        const registro =
          item as
            Record<
              string,
              unknown
            >

        const empresa =
          normalizarTexto(
            registro.empresa
          )

        const cargo =
          normalizarTexto(
            registro.cargo
          )

        if (
          !empresa &&
          !cargo
        ) {
          return null
        }

        return {
          empresa,

          cargo,

          periodo:
            normalizarTexto(
              registro.periodo
            ),

          descricao:
            normalizarTexto(
              registro.descricao
            )
        }
      }
    )
    .filter(
      (
        item
      ): item is
        ExperienciaProfissional =>
        item !== null
    )
}

function normalizarFormacoes(
  valor:
    unknown
): FormacaoProfissional[] {
  if (
    !Array.isArray(
      valor
    )
  ) {
    return []
  }

  return valor
    .map(
      item => {
        if (
          !item ||
          typeof item !==
          "object"
        ) {
          return null
        }

        const registro =
          item as
            Record<
              string,
              unknown
            >

        const instituicao =
          normalizarTexto(
            registro.instituicao
          )

        const curso =
          normalizarTexto(
            registro.curso
          )

        if (
          !instituicao &&
          !curso
        ) {
          return null
        }

        return {
          instituicao,

          curso,

          nivel:
            normalizarTexto(
              registro.nivel
            ),

          periodo:
            normalizarTexto(
              registro.periodo
            )
        }
      }
    )
    .filter(
      (
        item
      ): item is
        FormacaoProfissional =>
        item !== null
    )
}

function normalizarCursos(
  valor:
    unknown
): CursoProfissional[] {
  if (
    !Array.isArray(
      valor
    )
  ) {
    return []
  }

  return valor
    .map(
      item => {
        if (
          !item ||
          typeof item !==
          "object"
        ) {
          return null
        }

        const registro =
          item as
            Record<
              string,
              unknown
            >

        const nome =
          normalizarTexto(
            registro.nome
          )

        if (!nome) {
          return null
        }

        return {
          nome,

          instituicao:
            normalizarTexto(
              registro.instituicao
            ),

          ano:
            normalizarTexto(
              registro.ano
            )
        }
      }
    )
    .filter(
      (
        item
      ): item is
        CursoProfissional =>
        item !== null
    )
}

/**
 * Eu valido e normalizo tudo que chega da interface antes de gravar
 * no banco.
 */
export function normalizarPerfilProfissional(
  valor:
    unknown
): PerfilProfissional {
  if (
    !valor ||
    typeof valor !==
    "object"
  ) {
    throw new Error(
      "Perfil profissional inválido"
    )
  }

  const registro =
    valor as
      Record<
        string,
        unknown
      >

  return {
    resumoProfissional:
      normalizarTexto(
        registro
          .resumoProfissional
      ),

    cargosPrincipais:
      normalizarLista(
        registro
          .cargosPrincipais
      ),

    cargosRelacionados:
      normalizarLista(
        registro
          .cargosRelacionados
      ),

    cargosDesvio:
      normalizarLista(
        registro
          .cargosDesvio
      ),

    competencias:
      normalizarCompetencias(
        registro
          .competencias
      ),

    experiencias:
      normalizarExperiencias(
        registro
          .experiencias
      ),

    formacoes:
      normalizarFormacoes(
        registro
          .formacoes
      ),

    cursos:
      normalizarCursos(
        registro
          .cursos
      ),

    localizacoesAceitas:
      normalizarLista(
        registro
          .localizacoesAceitas
      ),

    titulosExcluidos:
      normalizarLista(
        registro
          .titulosExcluidos
      )
  }
}

function substituirLista(
  destino:
    string[],

  origem:
    string[]
) {
  destino.splice(
    0,
    destino.length,
    ...origem
  )
}

/**
 * O matcher atual já importa perfilBusca diretamente.
 *
 * Por isso eu atualizo o mesmo objeto em memória em vez de criar uma
 * segunda configuração paralela.
 */
function aplicarPerfilNoMatcher(
  perfil:
    PerfilProfissional
) {
  substituirLista(
    perfilBusca
      .cargosPrincipais,
    perfil.cargosPrincipais
  )

  substituirLista(
    perfilBusca
      .cargosRelacionados,
    perfil.cargosRelacionados
  )

  substituirLista(
    perfilBusca
      .cargosDesvio,
    perfil.cargosDesvio
  )

  perfilBusca
    .competencias
    .splice(
      0,
      perfilBusca
        .competencias
        .length,

      ...perfil
        .competencias
        .map(
          competencia => ({
            nome:
              competencia.nome,

            termos: [
              ...competencia.termos
            ]
          })
        )
    )

  substituirLista(
    perfilBusca
      .localizacoesAceitas,
    perfil.localizacoesAceitas
  )

  substituirLista(
    perfilBusca
      .titulosExcluidos,
    perfil.titulosExcluidos
  )
}

/**
 * Se ainda não existe um perfil salvo, continuo usando exatamente a
 * configuração atual do search-profile.ts.
 */
export async function obterPerfilProfissional() {
  const salvo =
    await buscarPerfilProfissionalSalvo()

  if (salvo) {
    return salvo
  }

  return {
    perfil:
      criarPerfilPadrao(),

    nomeArquivoOrigem:
      null,

    atualizadoEm:
      null
  }
}

/**
 * Eu recarrego o perfil do PostgreSQL antes das operações importantes
 * de análise e descoberta.
 */
export async function carregarPerfilProfissionalAtivo() {
  const dados =
    await obterPerfilProfissional()

  aplicarPerfilNoMatcher(
    dados.perfil
  )

  return dados
}

export async function salvarPerfilProfissional(
  valor:
    unknown,

  nomeArquivoOrigem:
    string | null = null
) {
  const perfil =
    normalizarPerfilProfissional(
      valor
    )

  const salvo =
    await salvarPerfilProfissionalNoBanco(
      perfil,
      nomeArquivoOrigem
    )

  aplicarPerfilNoMatcher(
    salvo.perfil
  )

  return salvo
}