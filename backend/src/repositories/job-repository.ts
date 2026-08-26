import { db } from "../database/connection.js"

import type { NewJob, StoredJob } from "../types/job.js"

const TAMANHO_LOTE_ATUALIZACAO = 100

export type ResultadoAtualizacaoVagasExistentes = {
  updated: number

  invalidated: number
}

/**
 * Elimino repetições antes de enviar os dados ao PostgreSQL.
 *
 * A mesma oportunidade pode aparecer em mais de um termo de pesquisa,
 * mas source + external_id continua sendo a chave canônica da vaga.
 */
function deduplicarVagas(jobs: NewJob[]) {
  const unicas = new Map<string, NewJob>()

  for (const job of jobs) {
    unicas.set(`${job.source}\u0000${job.externalId}`, job)
  }

  return [...unicas.values()]
}

function prepararLote(jobs: NewJob[], sourceKey?: string) {
  return jobs.map(job => ({
    source: job.source,

    external_id: job.externalId,

    company: job.company,

    title: job.title,

    description: job.description,

    location: job.location,

    remote: job.remote,

    url: job.url,

    published_at: job.publishedAt,

    partial: job.partial ?? false,

    source_key: sourceKey ?? null
  }))
}

/**
 * Atualizo somente vagas que já existem.
 *
 * Além dos dados da oportunidade, cada reencontro da vaga atualiza:
 *
 * - last_seen_at;
 * - source_key, quando a coleta possui uma origem identificável;
 * - unavailable_at volta para NULL caso uma vaga anteriormente encerrada
 *   reapareça na fonte.
 *
 * Alterações que influenciam o matcher continuam invalidando somente a
 * versão da análise correspondente.
 */
async function atualizarLoteVagasExistentes(jobs: NewJob[], sourceKey?: string) {
  const result = await db.query(
    `
      WITH incoming AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS i(
          source TEXT,
          external_id TEXT,
          company TEXT,
          title TEXT,
          description TEXT,
          location TEXT,
          remote BOOLEAN,
          url TEXT,
          published_at TIMESTAMPTZ,
          partial BOOLEAN,
          source_key TEXT
        )
      ),

      prepared AS (
        SELECT
          j.id,

          CASE
            WHEN
              i.company = 'Empresa não identificada'
              AND j.company <> 'Empresa não identificada'
              THEN j.company

            ELSE i.company
          END AS company,

          i.title,

          CASE
            WHEN
              i.partial = TRUE
              AND j.partial = FALSE
              THEN j.description

            ELSE i.description
          END AS description,

          COALESCE(
            i.location,
            j.location
          ) AS location,

          i.remote,

          i.url,

          COALESCE(
            i.published_at,
            j.published_at
          ) AS published_at,

          (
            j.partial
            AND i.partial
          ) AS partial,

          COALESCE(
            i.source_key,
            j.source_key
          ) AS source_key

        FROM jobs j

        INNER JOIN incoming i
          ON i.source = j.source
          AND i.external_id = j.external_id
      ),

      changes AS (
        SELECT
          p.*,

          ROW(
            j.title,
            j.description,
            j.location,
            j.remote
          )
          IS DISTINCT FROM
          ROW(
            p.title,
            p.description,
            p.location,
            p.remote
          ) AS affects_match,

          ROW(
            j.company,
            j.title,
            j.description,
            j.location,
            j.remote,
            j.url,
            j.published_at,
            j.partial,
            j.source_key
          )
          IS DISTINCT FROM
          ROW(
            p.company,
            p.title,
            p.description,
            p.location,
            p.remote,
            p.url,
            p.published_at,
            p.partial,
            p.source_key
          ) AS has_change

        FROM prepared p

        INNER JOIN jobs j
          ON j.id = p.id
      ),

      metadata_changes AS (
        SELECT id
        FROM changes
        WHERE has_change
      ),

      updated AS (
        UPDATE jobs j

        SET
          company = c.company,

          title = c.title,

          description = c.description,

          location = c.location,

          remote = c.remote,

          url = c.url,

          published_at = c.published_at,

          partial = c.partial,

          source_key = c.source_key,

          last_seen_at = NOW(),

          unavailable_at = NULL

        FROM changes c

        WHERE j.id = c.id

        RETURNING j.id
      ),

      invalidated AS (
        UPDATE job_matches jm

        SET
          matcher_version = 0

        FROM changes c

        WHERE
          jm.job_id = c.id
          AND c.affects_match

        RETURNING jm.job_id
      )

      SELECT
        (
          SELECT COUNT(*)::int
          FROM metadata_changes
        ) AS updated,

        (
          SELECT COUNT(*)::int
          FROM invalidated
        ) AS invalidated
    `,
    [JSON.stringify(prepararLote(jobs, sourceKey))]
  )

  return {
    updated: Number(result.rows[0]?.updated ?? 0),

    invalidated: Number(result.rows[0]?.invalidated ?? 0)
  }
}

/**
 * Atualizo em lotes para evitar centenas de UPDATEs individuais ou uma
 * query gigantesca contendo todas as descrições.
 *
 * O reencontro de uma oportunidade sempre atualiza last_seen_at, mesmo
 * quando título, descrição e demais metadados continuam iguais.
 */
export async function refreshExistingJobs(
  jobs: NewJob[],
  sourceKey?: string
): Promise<ResultadoAtualizacaoVagasExistentes> {
  const unicas = deduplicarVagas(jobs)

  let updated = 0

  let invalidated = 0

  for (let inicio = 0; inicio < unicas.length; inicio += TAMANHO_LOTE_ATUALIZACAO) {
    const lote = unicas.slice(inicio, inicio + TAMANHO_LOTE_ATUALIZACAO)

    const resultado = await atualizarLoteVagasExistentes(lote, sourceKey)

    updated += resultado.updated

    invalidated += resultado.invalidated
  }

  return {
    updated,

    invalidated
  }
}

/**
 * Quando uma coleta de um board foi comprovadamente completa, qualquer
 * vaga conhecida daquele mesmo board que não apareceu na resposta atual
 * pode ser marcada como indisponível.
 *
 * Não executo esta rotina para buscas parciais, paginações interrompidas
 * ou agregadores. A ausência nesses casos não prova encerramento.
 */
export async function reconcileCompleteSourceAvailability(sourceKey: string, jobs: NewJob[]) {
  const chave = sourceKey.trim()

  if (!chave) {
    return 0
  }

  const vistos = deduplicarVagas(jobs).map(job => ({
    source: job.source,

    external_id: job.externalId
  }))

  const result = await db.query(
    `
      WITH seen AS (
        SELECT *
        FROM jsonb_to_recordset($2::jsonb) AS s(
          source TEXT,
          external_id TEXT
        )
      )

      UPDATE jobs j

      SET
        unavailable_at =
          COALESCE(
            j.unavailable_at,
            NOW()
          )

      WHERE
        j.source_key = $1

        AND j.unavailable_at IS NULL

        AND NOT EXISTS (
          SELECT 1
          FROM seen s
          WHERE
            s.source = j.source
            AND s.external_id = j.external_id
        )

      RETURNING j.id
    `,
    [chave, JSON.stringify(vistos)]
  )

  return result.rowCount ?? 0
}

/**
 * Listo todas as oportunidades armazenadas.
 */
export async function listJobs(): Promise<StoredJob[]> {
  const result = await db.query(`
      SELECT
        id,
        source,
        external_id,
        company,
        title,
        description,
        location,
        remote,
        url,
        published_at,
        partial,
        created_at

      FROM jobs

      ORDER BY
        published_at DESC NULLS LAST,
        created_at DESC
    `)

  return result.rows
}

/**
 * Retorno oportunidades que precisam ser analisadas pela versão
 * atual do matcher.
 *
 * Isso inclui:
 *
 * - vagas ainda sem job_match;
 * - análises produzidas por uma versão anterior;
 * - vagas cujo conteúdo relevante mudou depois de uma nova coleta.
 */
export async function listJobsPendingAnalysis(matcherVersion: number): Promise<StoredJob[]> {
  const result = await db.query(
    `
      SELECT
        j.id,
        j.source,
        j.external_id,
        j.company,
        j.title,
        j.description,
        j.location,
        j.remote,
        j.url,
        j.published_at,
        j.partial,
        j.created_at

      FROM jobs j

      LEFT JOIN job_matches jm
        ON jm.job_id = j.id

      WHERE
        (
          jm.id IS NULL
          OR jm.matcher_version < $1
        )

        AND j.unavailable_at IS NULL

      ORDER BY
        j.published_at DESC NULLS LAST,
        j.created_at DESC
    `,
    [matcherVersion]
  )

  return result.rows
}

/**
 * Mantido para compatibilidade com rotinas que precisem consultar
 * estritamente vagas sem nenhuma análise.
 */
export async function listUnmatchedJobs(): Promise<StoredJob[]> {
  const result = await db.query(`
      SELECT
        j.id,
        j.source,
        j.external_id,
        j.company,
        j.title,
        j.description,
        j.location,
        j.remote,
        j.url,
        j.published_at,
        j.partial,
        j.created_at

      FROM jobs j

      LEFT JOIN job_matches jm
        ON jm.job_id = j.id

      WHERE
        jm.id IS NULL
        AND j.unavailable_at IS NULL

      ORDER BY
        j.published_at DESC NULLS LAST,
        j.created_at DESC
    `)

  return result.rows
}

/**
 * Procuro uma oportunidade pela chave utilizada na deduplicação.
 */
export async function findJobBySourceExternalId(
  source: string,
  externalId: string
): Promise<StoredJob | null> {
  const result = await db.query(
    `
        SELECT
          id,
          source,
          external_id,
          company,
          title,
          description,
          location,
          remote,
          url,
          published_at,
          partial,
          created_at

        FROM jobs

        WHERE
          source = $1
          AND external_id = $2

        LIMIT 1
      `,
    [source, externalId]
  )

  return result.rows[0] ?? null
}

/**
 * Salvo uma oportunidade nova.
 *
 * sourceKey é opcional porque fontes agregadas ou descobertas web podem
 * não representar um único board autoritativo.
 */
export async function createJob(job: NewJob, sourceKey?: string): Promise<StoredJob> {
  const result = await db.query(
    `
        INSERT INTO jobs (
          source,
          external_id,
          company,
          title,
          description,
          location,
          remote,
          url,
          published_at,
          partial,
          source_key
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11
        )

        RETURNING *
      `,
    [
      job.source,

      job.externalId,

      job.company,

      job.title,

      job.description,

      job.location,

      job.remote,

      job.url,

      job.publishedAt,

      job.partial ?? false,

      sourceKey ?? null
    ]
  )

  return result.rows[0]
}

/**
 * O PostgreSQL utiliza o código 23505 quando uma restrição UNIQUE
 * é violada.
 */
export function isDuplicateJobError(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false
  }

  return (
    (
      error as {
        code?: string
      }
    ).code === "23505"
  )
}
