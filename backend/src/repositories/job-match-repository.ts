import { db } from "../database/connection.js"
import type { NewJobMatch } from "../types/job.js"

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
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)

      ON CONFLICT (job_id)
      DO UPDATE SET
        local_score = EXCLUDED.local_score,
        matched_skills = EXCLUDED.matched_skills,
        reasons = EXCLUDED.reasons,
        analyzed_at = NOW(),

        -- O score pode mudar depois de ajustarmos o matcher,
        -- mas uma decisão manual do usuário precisa ser preservada.
        status = CASE
          WHEN job_matches.status IN ('applied', 'ignored')
            THEN job_matches.status
          ELSE EXCLUDED.status
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
        j.created_at,

        jm.local_score,
        jm.matched_skills,
        jm.reasons,
        jm.status,
        jm.analyzed_at

      FROM job_matches jm

      INNER JOIN jobs j
        ON j.id = jm.job_id

      WHERE
        jm.status = 'relevant'
        AND jm.local_score >= $1

      ORDER BY
        jm.local_score DESC,
        j.published_at DESC NULLS LAST
    `,
    [minScore]
  )

  return result.rows
}