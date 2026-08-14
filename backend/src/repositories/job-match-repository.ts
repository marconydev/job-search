import { db } from "../database/connection.js"

import type { JobMatchStatus, NewJobMatch, UserJobStatus } from "../types/job.js"

/**
 * Salvo ou atualizo o resultado produzido pelo matcher.
 *
 * Se eu já tiver tomado uma decisão manual sobre a oportunidade,
 * preservo essa decisão quando o matcher for executado novamente.
 */
export async function saveJobMatch(match: NewJobMatch) {
  const result = await db.query(
    `
        INSERT INTO job_matches (
          job_id,
          local_score,
          matched_skills,
          reasons,
          status
        )
        VALUES (
          $1,
          $2,
          $3::jsonb,
          $4::jsonb,
          $5
        )

        ON CONFLICT (job_id)
        DO UPDATE SET

          local_score =
            EXCLUDED.local_score,

          matched_skills =
            EXCLUDED.matched_skills,

          reasons =
            EXCLUDED.reasons,

          analyzed_at =
            NOW(),

          status_updated_at =
            CASE
              WHEN job_matches.status IN (
                'viewed',
                'applied',
                'ignored'
              )
                THEN job_matches.status_updated_at

              WHEN job_matches.status
                IS DISTINCT FROM
                EXCLUDED.status
                THEN NOW()

              ELSE
                job_matches.status_updated_at
            END,

          status =
            CASE
              WHEN job_matches.status IN (
                'viewed',
                'applied',
                'ignored'
              )
                THEN job_matches.status

              ELSE
                EXCLUDED.status
            END

        RETURNING *
      `,
    [
      match.jobId,
      match.localScore,
      JSON.stringify(match.matchedSkills),
      JSON.stringify(match.reasons),
      match.status
    ]
  )

  return result.rows[0]
}

/**
 * Continuo considerando uma vaga vista como oportunidade relevante.
 *
 * Isso evita que ela desapareça da lista principal apenas porque eu
 * abri o anúncio uma vez.
 */
export async function listRelevantJobMatches(minScore: number) {
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
          j.created_at,

          jm.local_score,
          jm.matched_skills,
          jm.reasons,
          jm.status,
          jm.analyzed_at,
          jm.status_updated_at,
          jm.viewed_at,
          jm.applied_at

        FROM job_matches jm

        INNER JOIN jobs j
          ON j.id = jm.job_id

        WHERE
          jm.status IN (
            'relevant',
            'viewed'
          )
          AND jm.local_score >= $1

        ORDER BY
          CASE
            WHEN jm.status = 'relevant'
              THEN 0
            ELSE 1
          END,

          jm.local_score DESC,

          j.published_at
            DESC NULLS LAST,

          j.created_at DESC
      `,
    [minScore]
  )

  return result.rows
}

/**
 * Esta será a consulta principal utilizada pelo frontend.
 *
 * Não mostro descartadas automaticamente porque elas não precisam
 * ocupar espaço no dashboard operacional.
 */
export async function listDashboardJobMatches() {
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
        j.created_at,

        jm.local_score,
        jm.matched_skills,
        jm.reasons,
        jm.status,
        jm.analyzed_at,
        jm.status_updated_at,
        jm.viewed_at,
        jm.applied_at

      FROM job_matches jm

      INNER JOIN jobs j
        ON j.id = jm.job_id

      WHERE
        jm.status <> 'discarded'

      ORDER BY
        CASE jm.status
          WHEN 'relevant' THEN 0
          WHEN 'viewed' THEN 1
          WHEN 'applied' THEN 2
          WHEN 'ignored' THEN 3
          ELSE 4
        END,

        jm.local_score DESC,

        j.created_at DESC
    `)

  return result.rows
}

/**
 * Calculo os indicadores apresentados nos cards superiores do
 * dashboard.
 */
export async function getJobDashboardSummary() {
  const result = await db.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE jm.status = 'relevant'
        )::int AS novas,

        COUNT(*) FILTER (
          WHERE jm.status = 'viewed'
        )::int AS vistas,

        COUNT(*) FILTER (
          WHERE jm.status = 'applied'
        )::int AS aplicadas,

        COUNT(*) FILTER (
          WHERE jm.status = 'ignored'
        )::int AS ignoradas,

        COUNT(*) FILTER (
          WHERE
            jm.status = 'relevant'
            AND j.created_at::date =
                CURRENT_DATE
        )::int AS novas_hoje,

        COUNT(*) FILTER (
          WHERE
            jm.status <> 'discarded'
            AND j.partial = TRUE
        )::int AS parciais,

        COUNT(*) FILTER (
          WHERE jm.status <> 'discarded'
        )::int AS total,

        COALESCE(
          ROUND(
            AVG(jm.local_score)
            FILTER (
              WHERE
                jm.status <> 'discarded'
            )
          ),
          0
        )::int AS pontuacao_media

      FROM job_matches jm

      INNER JOIN jobs j
        ON j.id = jm.job_id
    `)

  return result.rows[0]
}

/**
 * Atualizo uma decisão manual do usuário.
 *
 * Quando uma vaga é vista ou aplicada pela primeira vez, preservo a
 * respectiva data mesmo que o status seja alterado novamente depois.
 */
export async function updateJobMatchStatus(jobId: number, status: UserJobStatus) {
  const result = await db.query(
    `
        UPDATE job_matches
        SET
          status =
            $2::varchar,

          status_updated_at =
            NOW(),

          viewed_at =
            CASE
              WHEN $2::varchar = 'viewed'
                THEN COALESCE(
                  viewed_at,
                  NOW()
                )

              ELSE viewed_at
            END,

          applied_at =
            CASE
              WHEN $2::varchar = 'applied'
                THEN COALESCE(
                  applied_at,
                  NOW()
                )

              ELSE applied_at
            END

        WHERE job_id = $1

        RETURNING
          id,
          job_id,
          local_score,
          matched_skills,
          reasons,
          status,
          created_at,
          analyzed_at,
          status_updated_at,
          viewed_at,
          applied_at
      `,
    [jobId, status]
  )

  return result.rows[0] ?? null
}

/**
 * Uso esta validação também na rota para não aceitar qualquer texto
 * recebido do frontend.
 */
export function isUserJobStatus(value: unknown): value is UserJobStatus {
  const statuses: JobMatchStatus[] = ["relevant", "viewed", "applied", "ignored"]

  return typeof value === "string" && statuses.includes(value as JobMatchStatus)
}
