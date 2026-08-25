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

function prepararLote(jobs: NewJob[]) {
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

    partial: job.partial ?? false
  }))
}

/**
 * Atualizo somente vagas que já existem.
 *
 * Isso é proposital:
 *
 * - vagas novas continuam passando pelo filtro antes do INSERT;
 * - vagas existentes recebem correções da fonte antes do filtro.
 *
 * Isso permite corrigir, por exemplo:
 *
 * remote=true
 * Governador Valadares
 *
 * para:
 *
 * remote=false
 * Governador Valadares
 *
 * mesmo que a vaga, depois da correção, deixe de passar pelo filtro.
 *
 * Quando título, descrição, localização ou modalidade mudam,
 * matcher_version volta para 0 e a vaga será reanalisada.
 */
async function atualizarLoteVagasExistentes(jobs: NewJob[]) {
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
          partial BOOLEAN
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
          ) AS partial

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
            j.partial
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
            p.partial
          ) AS has_change

        FROM prepared p

        INNER JOIN jobs j
          ON j.id = p.id
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

          partial = c.partial

        FROM changes c

        WHERE
          j.id = c.id
          AND c.has_change

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
          FROM updated
        ) AS updated,

        (
          SELECT COUNT(*)::int
          FROM invalidated
        ) AS invalidated
    `,
    [JSON.stringify(prepararLote(jobs))]
  )

  return {
    updated: Number(result.rows[0]?.updated ?? 0),

    invalidated: Number(result.rows[0]?.invalidated ?? 0)
  }
}

/**
 * Atualizo em lotes para evitar:
 *
 * - centenas de UPDATEs individuais;
 * - uma única query gigantesca contendo todas as descrições.
 *
 * Com 775 vagas da Gupy, por exemplo, serão aproximadamente
 * 8 operações no PostgreSQL em vez de 775.
 */
export async function refreshExistingJobs(
  jobs: NewJob[]
): Promise<ResultadoAtualizacaoVagasExistentes> {
  const unicas = deduplicarVagas(jobs)

  let updated = 0

  let invalidated = 0

  for (let inicio = 0; inicio < unicas.length; inicio += TAMANHO_LOTE_ATUALIZACAO) {
    const lote = unicas.slice(inicio, inicio + TAMANHO_LOTE_ATUALIZACAO)

    const resultado = await atualizarLoteVagasExistentes(lote)

    updated += resultado.updated

    invalidated += resultado.invalidated
  }

  return {
    updated,

    invalidated
  }
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
        jm.id IS NULL
        OR jm.matcher_version < $1

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

      WHERE jm.id IS NULL

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
