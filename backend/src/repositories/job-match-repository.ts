import { JOB_LIFECYCLE } from "../config/job-lifecycle.js"

import { MATCHER_VERSION } from "../config/matcher.js"

import { db } from "../database/connection.js"

import type { NewJobMatch, UserJobStatus } from "../types/job.js"

const { maxAgeDays, requireConfirmationAfterDays, confirmationFreshnessDays } = JOB_LIFECYCLE

/**
 * Salvo ou atualizo o resultado produzido pelo matcher.
 *
 * Preservo decisões manuais definitivas como aplicada e ignorada.
 * Visualização não interfere no status e permanece registrada em viewed_at.
 *
 * matcher_version registra qual conjunto de regras produziu a análise.
 */
export async function saveJobMatch(match: NewJobMatch) {
  const result = await db.query(
    `
        INSERT INTO job_matches (
          job_id,
          local_score,
          matched_skills,
          reasons,
          status,
          matcher_version
        )

        VALUES (
          $1,
          $2,
          $3::jsonb,
          $4::jsonb,
          $5,
          $6
        )

        ON CONFLICT (job_id)

        DO UPDATE SET

          local_score =
            EXCLUDED.local_score,

          matched_skills =
            EXCLUDED.matched_skills,

          reasons =
            EXCLUDED.reasons,

          matcher_version =
            EXCLUDED.matcher_version,

          analyzed_at =
            NOW(),

          status_updated_at =
            CASE

              WHEN job_matches.status IN (
                'applied',
                'ignored'
              )
                THEN
                  job_matches.status_updated_at

              WHEN
                job_matches.status
                  IS DISTINCT FROM
                EXCLUDED.status

                THEN NOW()

              ELSE
                job_matches.status_updated_at

            END,

          status =
            CASE

              WHEN job_matches.status IN (
                'applied',
                'ignored'
              )
                THEN
                  job_matches.status

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

      match.status,

      MATCHER_VERSION
    ]
  )

  return result.rows[0]
}

/**
 * Retorno somente oportunidades abertas e ainda atuais.
 *
 * Regras:
 *
 * - indisponível na fonte: não aparece;
 * - até 15 dias: normal;
 * - entre 15 e 21 dias: exige confirmação recente;
 * - acima de 21 dias: deixa a fila operacional.
 *
 * Aplicadas e ignoradas não passam por esta consulta.
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

          CASE
            WHEN jm.status = 'viewed'
              THEN 'relevant'
            ELSE jm.status
          END AS status,

          jm.matcher_version,
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

          AND j.unavailable_at IS NULL

          AND COALESCE(
            j.published_at,
            j.created_at
          ) >= NOW() - ($2::int * INTERVAL '1 day')

          AND (
            COALESCE(
              j.published_at,
              j.created_at
            ) >= NOW() - ($3::int * INTERVAL '1 day')

            OR j.last_seen_at >=
              NOW() - ($4::int * INTERVAL '1 day')
          )

        ORDER BY
          CASE
            WHEN jm.viewed_at IS NULL
              THEN 0
            ELSE 1
          END,

          jm.local_score DESC,

          j.published_at
            DESC NULLS LAST,

          j.created_at DESC
      `,
    [minScore, maxAgeDays, requireConfirmationAfterDays, confirmationFreshnessDays]
  )

  return result.rows
}

/**
 * Esta é a consulta principal utilizada pelo frontend.
 *
 * Regras temporais são aplicadas somente às oportunidades ainda em aberto.
 * Aplicadas e ignoradas continuam disponíveis como histórico mesmo quando
 * a publicação já envelheceu ou saiu do ATS.
 */
export async function listDashboardJobMatches() {
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

        CASE
          WHEN jm.status = 'viewed'
            THEN 'relevant'
          ELSE jm.status
        END AS status,

        jm.matcher_version,
        jm.analyzed_at,
        jm.status_updated_at,
        jm.viewed_at,
        jm.applied_at

      FROM job_matches jm

      INNER JOIN jobs j
        ON j.id = jm.job_id

      WHERE
        jm.status <> 'discarded'

        AND (
          jm.status IN (
            'applied',
            'ignored'
          )

          OR (
            jm.status IN (
              'relevant',
              'viewed'
            )

            AND j.unavailable_at IS NULL

            AND COALESCE(
              j.published_at,
              j.created_at
            ) >= NOW() - ($1::int * INTERVAL '1 day')

            AND (
              COALESCE(
                j.published_at,
                j.created_at
              ) >= NOW() - ($2::int * INTERVAL '1 day')

              OR j.last_seen_at >=
                NOW() - ($3::int * INTERVAL '1 day')
            )
          )
        )

      ORDER BY
        CASE
          WHEN
            jm.status IN ('relevant', 'viewed')
            AND jm.viewed_at IS NULL
            THEN 0

          WHEN jm.status IN ('relevant', 'viewed')
            THEN 1

          WHEN jm.status = 'applied'
            THEN 2

          WHEN jm.status = 'ignored'
            THEN 3

          ELSE 4
        END,

        jm.local_score DESC,

        j.created_at DESC
    `,
    [maxAgeDays, requireConfirmationAfterDays, confirmationFreshnessDays]
  )

  return result.rows
}

/**
 * Calculo os indicadores a partir exatamente do mesmo conjunto de vagas
 * que pode aparecer no dashboard.
 *
 * Assim contadores e lista não possuem políticas temporais diferentes.
 */
export async function getJobDashboardSummary() {
  const result = await db.query(
    `
      WITH dashboard AS (
        SELECT
          j.partial,

          j.created_at AS job_created_at,

          jm.local_score,

          jm.status,

          jm.viewed_at

        FROM job_matches jm

        INNER JOIN jobs j
          ON j.id = jm.job_id

        WHERE
          jm.status <> 'discarded'

          AND (
            jm.status IN (
              'applied',
              'ignored'
            )

            OR (
              jm.status IN (
                'relevant',
                'viewed'
              )

              AND j.unavailable_at IS NULL

              AND COALESCE(
                j.published_at,
                j.created_at
              ) >= NOW() - ($1::int * INTERVAL '1 day')

              AND (
                COALESCE(
                  j.published_at,
                  j.created_at
                ) >= NOW() - ($2::int * INTERVAL '1 day')

                OR j.last_seen_at >=
                  NOW() - ($3::int * INTERVAL '1 day')
              )
            )
          )
      )

      SELECT

        COUNT(*) FILTER (
          WHERE
            status IN ('relevant', 'viewed')
            AND viewed_at IS NULL
        )::int AS novas,

        COUNT(*) FILTER (
          WHERE
            status IN ('relevant', 'viewed')
            AND viewed_at IS NOT NULL
        )::int AS vistas,

        COUNT(*) FILTER (
          WHERE status = 'applied'
        )::int AS aplicadas,

        COUNT(*) FILTER (
          WHERE status = 'ignored'
        )::int AS ignoradas,

        COUNT(*) FILTER (
          WHERE
            status IN ('relevant', 'viewed')
            AND job_created_at::date =
              CURRENT_DATE
        )::int AS novas_hoje,

        COUNT(*) FILTER (
          WHERE partial = TRUE
        )::int AS parciais,

        COUNT(*)::int AS total,

        COALESCE(
          ROUND(
            AVG(local_score)
          ),
          0
        )::int AS pontuacao_media

      FROM dashboard
    `,
    [maxAgeDays, requireConfirmationAfterDays, confirmationFreshnessDays]
  )

  return result.rows[0]
}

/**
 * Atualizo somente decisões que realmente mudam o estado operacional.
 *
 * A operação é idempotente: repetir o mesmo status não altera a data da
 * última mudança. Datas históricas de visualização e candidatura também
 * são preservadas.
 */
export async function updateJobMatchStatus(jobId: number, status: UserJobStatus) {
  const result = await db.query(
    `
        UPDATE job_matches

        SET
          status =
            $2::varchar,

          status_updated_at =
            CASE
              WHEN status IS DISTINCT FROM $2::varchar
                THEN NOW()
              ELSE status_updated_at
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
          matcher_version,
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
 * Registro a primeira abertura da oportunidade sem alterar seu status.
 *
 * COALESCE torna a operação idempotente: abrir novamente não sobrescreve
 * a data original em que a vaga foi vista.
 */
export async function markJobMatchViewed(jobId: number) {
  const result = await db.query(
    `
        UPDATE job_matches

        SET
          viewed_at =
            COALESCE(
              viewed_at,
              NOW()
            )

        WHERE
          job_id = $1
          AND status <> 'discarded'

        RETURNING
          id,
          job_id,
          local_score,
          matched_skills,
          reasons,

          CASE
            WHEN status = 'viewed'
              THEN 'relevant'
            ELSE status
          END AS status,

          matcher_version,
          created_at,
          analyzed_at,
          status_updated_at,
          viewed_at,
          applied_at
      `,
    [jobId]
  )

  return result.rows[0] ?? null
}
