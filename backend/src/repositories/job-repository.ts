import { db } from "../database/connection.js"

import type { NewJob, StoredJob } from "../types/job.js"

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
 * Retorno somente oportunidades que ainda não possuem uma análise
 * associada.
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

      WHERE jm.id IS NULL

      ORDER BY
        j.published_at DESC NULLS LAST,
        j.created_at DESC
    `)

  return result.rows
}

/**
 * Procuro uma oportunidade pela chave utilizada na deduplicação.
 *
 * Esta função será importante quando eu salvar as descobertas do
 * LinkedIn, Indeed, agregadores e outros portais.
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
 * Salvo uma oportunidade.
 *
 * partial é opcional para manter compatibilidade com os coletores
 * existentes. Quando não informado considero uma vaga completa.
 */
export async function createJob(job: NewJob): Promise<StoredJob> {
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
          partial
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
          $10
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
      job.partial ?? false
    ]
  )

  return result.rows[0]
}

/**
 * O PostgreSQL utiliza o código 23505 quando uma restrição UNIQUE
 * é violada.
 *
 * Neste projeto normalmente significa que a oportunidade já foi
 * encontrada anteriormente.
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
