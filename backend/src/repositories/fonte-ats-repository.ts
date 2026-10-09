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
 * Ordem de prioridade da fila de coleta (backoff por tempo).
 *
 * 1. boards com menos falhas tecnicas consecutivas
 *    (falhas_consecutivas so incrementa em erro PERMANENTE — 404/410);
 * 2. board que esta ha mais tempo elegivel para nova coleta:
 *      next_at = COALESCE(ultima_coleta_em, descoberta_em)
 *              + (1 + LEAST(coletas_sem_aderentes, 3)) * intervalo_base
 * 3. empate final pela ultima descoberta.
 *
 * Resolve a inanicao do modelo anterior. Com ORDER BY LEAST(sem,10) ASC,
 * quando o numero de boards em bucket 0 era >= limite da fila, todos os
 * boards nos buckets inferiores ficavam permanentemente fora da coleta.
 *
 * Com backoff temporal, um board improdutivo nao e preterido: e visitado
 * com menos frequencia (2x, 3x, ate 4x o intervalo base). Produtivos
 * seguem a cada intervalo base.
 */
const INTERVALO_BASE_FILA_ATS_MS = 30 * 60 * 1000

export async function listarFontesAtsParaColeta(limite = 40): Promise<FonteAts[]> {
  const resultado = await db.query<LinhaFonteAts>(
    `
        SELECT *
        FROM fontes_ats

        WHERE ativa = TRUE

        ORDER BY
          falhas_consecutivas ASC,

          COALESCE(ultima_coleta_em, descoberta_em)
            + ((1 + LEAST(coletas_sem_aderentes, 3))
               * ($2::int * interval '1 millisecond'))
            ASC,

          ultima_vista_em DESC

        LIMIT $1
      `,
    [Math.max(1, Math.floor(limite)), INTERVALO_BASE_FILA_ATS_MS]
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

/**
 * Registra uma falha de coleta.
 *
 * Diferencia falha PERMANENTE (404, 410) de TRANSITORIA (timeout, 5xx,
 * 429, rede). Apenas falhas permanentes incrementam falhas_consecutivas
 * e podem desativar o board. Falhas transitorias so atualizam
 * ultima_coleta_em e ultimo_erro, para nao punir rede instavel.
 *
 * Apos 5 falhas permanentes consecutivas, o board e desativado:
 *   - ativa = FALSE
 *   - desativada_em = NOW()
 *   - motivo_desativacao = ultimo erro
 *
 * A linha NUNCA e removida. Reativacao ocorre via registrarFonteAts
 * (nova descoberta web) ou manualmente.
 */
export async function registrarFalhaColetaFonteAts(
  id: string,
  erro: string,
  permanente: boolean = false
) {
  await db.query(
    `
      UPDATE fontes_ats
      SET
        ultima_coleta_em = NOW(),

        falhas_consecutivas =
          CASE WHEN $3 THEN falhas_consecutivas + 1
               ELSE falhas_consecutivas END,

        ultimo_erro =
          LEFT($2, 1000),

        ativa =
          CASE
            WHEN $3 AND falhas_consecutivas + 1 >= 5 THEN FALSE
            ELSE ativa
          END,

        desativada_em =
          CASE
            WHEN $3 AND falhas_consecutivas + 1 >= 5 THEN NOW()
            ELSE desativada_em
          END,

        motivo_desativacao =
          CASE
            WHEN $3 AND falhas_consecutivas + 1 >= 5 THEN LEFT($2, 1000)
            ELSE motivo_desativacao
          END

      WHERE id = $1
    `,
    [id, erro, permanente]
  )
}
