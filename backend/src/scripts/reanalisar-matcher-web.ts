import "dotenv/config"

import {
  db
} from "../database/connection.js"

import {
  matchJob as avaliarVaga
} from "../services/job-matcher.js"

import type {
  StoredJob as VagaArmazenada
} from "../types/job.js"

type LinhaVaga = {
  id: string
  source: string
  externalId: string
  company: string
  title: string
  description: string
  location: string | null
  remote: boolean
  url: string
  publishedAt: Date | string | null
  createdAt: Date | string
  pontuacaoAnterior: number | null
  statusAnterior: string | null
}

const provedoresWeb = [
  "gupy",
  "lever",
  "greenhouse",
  "workable",
  "smartrecruiters"
]

const PONTUACAO_MINIMA_RELEVANTE = 60

/**
 * Converto a pontuação para o mesmo status utilizado atualmente
 * pela tabela job_matches.
 */
function definirStatus(
  pontuacao: number
) {
  return pontuacao >= PONTUACAO_MINIMA_RELEVANTE
    ? "relevant"
    : "discarded"
}

/**
 * Evito sobrescrever estados que futuramente representem uma decisão
 * manual minha sobre a oportunidade.
 */
function statusEhManual(
  status: string | null
) {
  return (
    status === "applied" ||
    status === "ignored"
  )
}

/**
 * Traduzo o status somente para deixar a saída do terminal mais clara.
 */
function traduzirStatus(
  status: string | null
) {
  const rotulos: Record<string, string> = {
    relevant: "RELEVANTE",
    discarded: "DESCARTADA",
    applied: "APLICADA",
    ignored: "IGNORADA"
  }

  if (!status) {
    return "SEM ANÁLISE"
  }

  return (
    rotulos[status] ??
    status.toUpperCase()
  )
}

/**
 * Recalculo somente as vagas trazidas pelo pipeline web.
 *
 * Faço toda a atualização dentro de uma transação para não deixar
 * parte das vagas com o matcher antigo caso alguma operação falhe.
 */
async function executar() {
  const cliente = await db.connect()

  try {
    const resultado =
      await cliente.query<LinhaVaga>(
        `
          SELECT
            j.id::text AS "id",
            j.source AS "source",
            j.external_id AS "externalId",
            j.company AS "company",
            j.title AS "title",
            j.description AS "description",
            j.location AS "location",
            j.remote AS "remote",
            j.url AS "url",
            j.published_at AS "publishedAt",
            j.created_at AS "createdAt",
            jm.local_score AS "pontuacaoAnterior",
            jm.status AS "statusAnterior"
          FROM jobs j
          LEFT JOIN job_matches jm
            ON jm.job_id = j.id
          WHERE j.source = ANY($1::varchar[])
          ORDER BY j.id
        `,
        [
          provedoresWeb
        ]
      )

    await cliente.query("BEGIN")

    let atualizadas = 0
    let relevantes = 0
    let descartadas = 0
    let mantidasManualmente = 0
    let mudancasStatus = 0

    console.log("")
    console.log("Reanalisando vagas web")
    console.log("======================")

    for (const linha of resultado.rows) {
      /**
       * Se eu já tiver marcado uma vaga manualmente como aplicada ou
       * ignorada, mantenho essa decisão mesmo que o matcher seja alterado.
       */
      if (
        statusEhManual(
          linha.statusAnterior
        )
      ) {
        mantidasManualmente++

        console.log("")
        console.log(
          `[MANTIDA] ${linha.company} | ${linha.title}`
        )

        console.log(
          `Status: ${traduzirStatus(linha.statusAnterior)}`
        )

        continue
      }

      const vaga =
        linha as unknown as VagaArmazenada

      const correspondencia =
        avaliarVaga(vaga)

      const novoStatus =
        definirStatus(
          correspondencia.score
        )

      if (
        novoStatus === "relevant"
      ) {
        relevantes++
      } else {
        descartadas++
      }

      const mudouStatus =
        linha.statusAnterior !== null &&
        linha.statusAnterior !== novoStatus

      if (mudouStatus) {
        mudancasStatus++

        console.log("")
        console.log(
          `[MUDOU] ${linha.company} | ${linha.title}`
        )

        console.log(
          `${linha.pontuacaoAnterior ?? "-"} → ${correspondencia.score}`
        )

        console.log(
          `${traduzirStatus(linha.statusAnterior)} → ${traduzirStatus(novoStatus)}`
        )
      }

      await cliente.query(
        `
          INSERT INTO job_matches (
            job_id,
            local_score,
            matched_skills,
            reasons,
            status,
            analyzed_at
          )
          VALUES (
            $1,
            $2,
            $3::jsonb,
            $4::jsonb,
            $5,
            NOW()
          )
          ON CONFLICT (job_id)
          DO UPDATE SET
            local_score = EXCLUDED.local_score,
            matched_skills = EXCLUDED.matched_skills,
            reasons = EXCLUDED.reasons,
            status = EXCLUDED.status,
            analyzed_at = NOW()
        `,
        [
          linha.id,
          correspondencia.score,
          JSON.stringify(
            correspondencia.matchedSkills
          ),
          JSON.stringify(
            correspondencia.reasons
          ),
          novoStatus
        ]
      )

      atualizadas++
    }

    await cliente.query("COMMIT")

    console.log("")
    console.log("Resumo da reanálise")
    console.log("-------------------")

    console.log(
      `Vagas encontradas:        ${resultado.rows.length}`
    )

    console.log(
      `Vagas atualizadas:        ${atualizadas}`
    )

    console.log(
      `Relevantes:               ${relevantes}`
    )

    console.log(
      `Descartadas:              ${descartadas}`
    )

    console.log(
      `Mudanças de status:       ${mudancasStatus}`
    )

    console.log(
      `Decisões manuais mantidas: ${mantidasManualmente}`
    )
  } catch (erro) {
    await cliente.query("ROLLBACK")

    console.error(
      "Não consegui reanalisar as vagas:",
      erro
    )

    process.exitCode = 1
  } finally {
    cliente.release()
    await db.end()
  }
}

executar()