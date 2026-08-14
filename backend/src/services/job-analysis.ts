import {
  saveJobMatch
} from "../repositories/job-match-repository.js"

import {
  listJobs,
  listUnmatchedJobs
} from "../repositories/job-repository.js"

import {
  matchJob
} from "./job-matcher.js"

import type {
  JobMatchStatus,
  StoredJob
} from "../types/job.js"

const RELEVANT_SCORE =
  60

function getMatchStatus(
  score:
    number
): JobMatchStatus {
  return score >=
    RELEVANT_SCORE
    ? "relevant"
    : "discarded"
}

/**
 * Eu concentro a análise em uma única função para utilizar exatamente a
 * mesma regra tanto em vagas novas quanto em uma reanálise completa.
 */
async function analisarVagas(
  jobs:
    StoredJob[]
) {
  let relevant =
    0

  let discarded =
    0

  for (
    const job
    of jobs
  ) {
    const match =
      matchJob(
        job
      )

    const status =
      getMatchStatus(
        match.score
      )

    await saveJobMatch({
      jobId:
        job.id,

      localScore:
        match.score,

      matchedSkills:
        match.matchedSkills,

      reasons:
        match.reasons,

      status
    })

    if (
      status ===
      "relevant"
    ) {
      relevant++
    } else {
      discarded++
    }
  }

  return {
    analyzed:
      jobs.length,

    relevant,

    discarded
  }
}

/**
 * Na sincronização normal eu continuo analisando somente vagas novas.
 */
export async function analyzePendingJobs() {
  const jobs =
    await listUnmatchedJobs()

  return analisarVagas(
    jobs
  )
}

/**
 * Quando meu perfil profissional muda, eu recalculo todas as vagas já
 * armazenadas.
 *
 * O saveJobMatch existente preserva decisões manuais como vista,
 * aplicada e ignorada.
 */
export async function reanalisarTodasAsVagas() {
  const jobs =
    await listJobs()

  return analisarVagas(
    jobs
  )
}