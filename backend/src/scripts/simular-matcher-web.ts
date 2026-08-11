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

type LinhaBanco = {
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

function definirStatus(
  pontuacao: number
) {
  return pontuacao >= 60
    ? "RELEVANTE"
    : "DESCARTADA"
}

/**
 * Mostro as mudanças de classificação primeiro para facilitar a
 * validação da nova regra antes de atualizar qualquer dado.
 */
async function executar() {
  try {
    const resultado =
      await db.query<LinhaBanco>(
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
          ORDER BY
            jm.local_score DESC NULLS LAST,
            j.id
        `,
        [
          provedoresWeb
        ]
      )

    let relevantesNovas = 0
    let descartadasNovas = 0
    let mudancas = 0

    console.log("")
    console.log("Simulação do novo matcher")
    console.log("=========================")

    for (const linha of resultado.rows) {
      const vaga =
        linha as unknown as VagaArmazenada

      const correspondencia =
        avaliarVaga(vaga)

      const statusNovo =
        definirStatus(
          correspondencia.score
        )

      const statusAnterior =
        linha.statusAnterior === "relevant"
          ? "RELEVANTE"
          : "DESCARTADA"

      if (
        statusNovo === "RELEVANTE"
      ) {
        relevantesNovas++
      } else {
        descartadasNovas++
      }

      const mudou =
        statusNovo !==
        statusAnterior

      if (mudou) {
        mudancas++
      }

      console.log("")
      console.log(
        `${mudou ? "⚠ MUDOU" : "  MANTEVE"} | ` +
        `${linha.pontuacaoAnterior ?? "-"} → ${correspondencia.score}`
      )

      console.log(
        `${statusAnterior} → ${statusNovo}`
      )

      console.log(
        `${linha.company} | ${linha.title}`
      )

      console.log(
        `Competências: ${
          correspondencia.matchedSkills.length > 0
            ? correspondencia.matchedSkills.join(", ")
            : "nenhuma"
        }`
      )

      console.log(
        `Motivos: ${correspondencia.reasons.join(", ")}`
      )

      console.log(
        "------------------------------------------------------------"
      )
    }

    console.log("")
    console.log("Resumo da simulação")
    console.log("-------------------")

    console.log(
      `Vagas avaliadas:     ${resultado.rows.length}`
    )

    console.log(
      `Relevantes novas:    ${relevantesNovas}`
    )

    console.log(
      `Descartadas novas:   ${descartadasNovas}`
    )

    console.log(
      `Mudanças de status:  ${mudancas}`
    )
  } catch (erro) {
    console.error(
      "Não consegui executar a simulação do matcher:",
      erro
    )

    process.exitCode = 1
  } finally {
    await db.end()
  }
}

executar()