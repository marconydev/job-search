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

  ultimos_aderentes: number

  coletas_sem_aderentes: number
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

    ultimoErro: linha.ultimo_erro,

    ultimosAderentes: linha.ultimos_aderentes,

    coletasSemAderentes: linha.coletas_sem_aderentes
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
 * Ordem de prioridade da fila de coleta:
 *
 * 1. boards com menos coletas improdutivas seguidas;
 * 2. empate desfeito pelo board que está há mais tempo sem coleta
 *    (board nunca coletado vai primeiro);
 * 3. empate final pela última descoberta.
 *
 * O cap em LEAST(coletas_sem_aderentes, 10) garante que um board que
 * ficou muito tempo sem entregar nada não fique permanentemente fora da
 * fila: quando ele empata com outros no topo do cap, a rotação por
 * tempo volta a dar chance a ele.
 */
export async function listarFontesAtsParaColeta(limite = 40): Promise<FonteAts[]> {
  const resultado = await db.query<LinhaFonteAts>(
    `
        SELECT *
        FROM fontes_ats

        WHERE ativa = TRUE

        ORDER BY
          LEAST(coletas_sem_aderentes, 10) ASC,

          ultima_coleta_em
            ASC NULLS FIRST,

          ultima_vista_em DESC

        LIMIT $1
      `,
    [Math.max(1, Math.floor(limite))]
  )

  return resultado.rows.map(mapearFonte)
}

/**
 * Registrar um sucesso de coleta com o número de vagas aderentes
 * permite afastar boards improdutivos nas próximas rotações.
 */
export async function registrarSucessoColetaFonteAts(id: string, aderentes = 0) {
  await db.query(
    `
      UPDATE fontes_ats
      SET
        ultima_coleta_em = NOW(),

        falhas_consecutivas = 0,

        ultimo_erro = NULL,

        ultimos_aderentes = $2,

        coletas_sem_aderentes =
          CASE
            WHEN $2 > 0
              THEN 0
            ELSE
              coletas_sem_aderentes + 1
          END

      WHERE id = $1
    `,
    [id, aderentes]
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
