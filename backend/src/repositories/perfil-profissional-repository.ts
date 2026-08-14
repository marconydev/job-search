import {
  db
} from "../database/connection.js"

import type {
  PerfilProfissional,
  PerfilProfissionalComMetadados
} from "../types/perfil-profissional.js"

type LinhaPerfil = {
  dados:
    PerfilProfissional

  nome_arquivo_origem:
    string | null

  updated_at:
    Date | string
}

function converterLinha(
  linha:
    LinhaPerfil
): PerfilProfissionalComMetadados {
  return {
    perfil:
      linha.dados,

    nomeArquivoOrigem:
      linha.nome_arquivo_origem,

    atualizadoEm:
      new Date(
        linha.updated_at
      ).toISOString()
  }
}

/**
 * Eu mantenho somente um perfil profissional ativo nesta aplicação.
 */
export async function buscarPerfilProfissionalSalvo() {
  const resultado =
    await db.query<LinhaPerfil>(`
      SELECT
        dados,
        nome_arquivo_origem,
        updated_at

      FROM perfil_profissional

      WHERE id = 1

      LIMIT 1
    `)

  const linha =
    resultado.rows[0]

  if (!linha) {
    return null
  }

  return converterLinha(
    linha
  )
}

/**
 * Eu salvo o perfil completo como JSONB porque suas seções possuem
 * estruturas diferentes e podem evoluir sem criar várias tabelas
 * desnecessárias para uma aplicação pessoal.
 */
export async function salvarPerfilProfissionalNoBanco(
  perfil:
    PerfilProfissional,

  nomeArquivoOrigem:
    string | null = null
) {
  const resultado =
    await db.query<LinhaPerfil>(
      `
        INSERT INTO perfil_profissional (
          id,
          dados,
          nome_arquivo_origem
        )
        VALUES (
          1,
          $1::jsonb,
          $2
        )

        ON CONFLICT (id)
        DO UPDATE SET

          dados =
            EXCLUDED.dados,

          nome_arquivo_origem =
            COALESCE(
              EXCLUDED.nome_arquivo_origem,
              perfil_profissional.nome_arquivo_origem
            ),

          updated_at =
            NOW()

        RETURNING
          dados,
          nome_arquivo_origem,
          updated_at
      `,
      [
        JSON.stringify(
          perfil
        ),

        nomeArquivoOrigem
      ]
    )

  return converterLinha(
    resultado.rows[0]
  )
}