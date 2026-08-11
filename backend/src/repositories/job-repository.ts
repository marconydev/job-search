import { db } from "../database/connection.js"
import type { NewJob } from "../types/job.js"

export async function listJobs() {
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
      created_at
    FROM jobs
    ORDER BY published_at DESC NULLS LAST, created_at DESC
  `)

  return result.rows
}

export async function listUnmatchedJobs() {
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
      j.created_at
    FROM jobs j
    LEFT JOIN job_matches jm
      ON jm.job_id = j.id
    WHERE jm.id IS NULL
    ORDER BY j.published_at DESC NULLS LAST, j.created_at DESC
  `)

  return result.rows
}

export async function createJob(job: NewJob) {
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
        published_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
      job.publishedAt
    ]
  )

  return result.rows[0]
}

// O PostgreSQL usa o código 23505 quando uma restrição UNIQUE é violada.
// No meu caso, isso normalmente significa que a vaga já foi coletada antes.
export function isDuplicateJobError(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false
  }

  return (error as { code?: string }).code === "23505"
}