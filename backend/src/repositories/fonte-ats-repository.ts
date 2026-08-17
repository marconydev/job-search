import { db } from "../database/connection.js"

import type { FonteAts, NovaFonteAts, ProvedorFonteAts } from "../types/fonte-ats.js"

type LinhaFonteAts = {
  id: string | number

  provedor: ProvedorFonteAts

  identificador: string

  variante: string

  url_origem: string

  ativa: boolean

  descoberta_em: string

  ultima_vista_em: string

  ultima_coleta_em: string | null

  falhas_consecutivas: number

  ultimo_erro: string | null
}

function mapearFonte(linha: LinhaFonteAts): FonteAts {
  return {
    id: String(linha.id),

    provedor: linha.provedor,

    identificador: linha.identificador,

    variante: linha.variante,

    urlOrigem: linha.url_origem,

    ativa: linha.ativa,

    descobertaEm: linha.descoberta_em,

    ultimaVistaEm: linha.ultima_vista_em,

    ultimaColetaEm: linha.ultima_coleta_em,

    falhasConsecutivas: linha.falhas_consecutivas,

    ultimoErro: linha.ultimo_erro
  }
}

/**
 * Eu salvo uma fonte nova quando a descubro pela primeira vez.
 *
 * Se ela já existir, apenas confirmo que continua ativa e atualizo a
 * última vez em que encontrei uma vaga relacionada àquele board.
 */
export async function registrarFonteAts(fonte: NovaFonteAts): Promise<FonteAts> {
  const resultado = await db.query<LinhaFonteAts>(
    `
        INSERT INTO fontes_ats (
          provedor,
          identificador,
          variante,
          url_origem
        )
        VALUES (
          $1,
          $2,
          $3,
          $4
        )

        ON CONFLICT (
          provedor,
          identificador,
          variante
        )
        DO UPDATE SET
          url_origem =
            EXCLUDED.url_origem,

          ativa =
            TRUE,

          ultima_vista_em =
            NOW()

        RETURNING *
      `,
    [fonte.provedor, fonte.identificador, fonte.variante, fonte.urlOrigem]
  )

  return mapearFonte(resultado.rows[0]!)
}

/**
 * Eu priorizo fontes nunca coletadas e, depois, as que estão há mais
 * tempo sem atualização.
 *
 * Isso permite que o número de empresas aprendidas cresça sem gerar uma
 * tempestade de centenas de requisições simultâneas.
 */
export async function listarFontesAtsParaColeta(limite = 40): Promise<FonteAts[]> {
  const resultado = await db.query<LinhaFonteAts>(
    `
        SELECT *
        FROM fontes_ats

        WHERE ativa = TRUE

        ORDER BY
          ultima_coleta_em
            ASC NULLS FIRST,

          ultima_vista_em DESC

        LIMIT $1
      `,
    [Math.max(1, Math.floor(limite))]
  )

  return resultado.rows.map(mapearFonte)
}

export async function registrarSucessoColetaFonteAts(id: string) {
  await db.query(
    `
      UPDATE fontes_ats
      SET
        ultima_coleta_em = NOW(),

        falhas_consecutivas = 0,

        ultimo_erro = NULL

      WHERE id = $1
    `,
    [id]
  )
}

export async function registrarFalhaColetaFonteAts(id: string, erro: string) {
  await db.query(
    `
      UPDATE fontes_ats
      SET
        ultima_coleta_em = NOW(),

        falhas_consecutivas =
          falhas_consecutivas + 1,

        ultimo_erro =
          LEFT($2, 1000)

      WHERE id = $1
    `,
    [id, erro]
  )
}
