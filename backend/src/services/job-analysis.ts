import { saveJobMatch } from "../repositories/job-match-repository.js"

import { listJobs, listUnmatchedJobs } from "../repositories/job-repository.js"

import type { JobMatchStatus, StoredJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { avaliarElegibilidadeBrasil } from "./elegibilidade-localizacao.js"

import { matchJob } from "./job-matcher.js"

const RELEVANT_SCORE = 60

function getMatchStatus(score: number): JobMatchStatus {
  return score >= RELEVANT_SCORE ? "relevant" : "discarded"
}

/**
 * Localização brasileira é obrigatória antes mesmo do matcher.
 *
 * Assim uma excelente correspondência técnica em Lituânia, Sérvia,
 * Estados Unidos ou uma vaga global nunca consegue compensar a
 * localização através do score.
 */
async function analisarVagas(jobs: StoredJob[], perfil: PerfilProfissional) {
  let relevant = 0

  let discarded = 0

  for (const job of jobs) {
    const elegibilidade = avaliarElegibilidadeBrasil(job.location, job.description, job.title)

    /**
 * Somente incompatibilidades geográficas comprovadas são descartadas
 * antes do matcher.
 *
 * Localização indefinida continua para análise profissional.
 */

    if (elegibilidade.situacao === "incompativel") {
      await saveJobMatch({
        jobId: job.id,

        localScore: 0,

        matchedSkills: [],

        reasons: [elegibilidade.motivo],

        status: "discarded"
      })

      discarded++

      continue
    }

    const match = matchJob(job, perfil)

    const status = getMatchStatus(match.score)

    await saveJobMatch({
      jobId: job.id,

      localScore: match.score,

      matchedSkills: match.matchedSkills,

      reasons: match.reasons,

      status
    })

    if (status === "relevant") {
      relevant++
    } else {
      discarded++
    }
  }

  return {
    analyzed: jobs.length,

    relevant,

    discarded
  }
}

export async function analyzePendingJobs(perfil: PerfilProfissional) {
  const jobs = await listUnmatchedJobs()

  return analisarVagas(jobs, perfil)
}

export async function reanalisarTodasAsVagas(perfil: PerfilProfissional) {
  const jobs = await listJobs()

  return analisarVagas(jobs, perfil)
}
