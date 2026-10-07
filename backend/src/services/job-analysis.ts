import { MATCHER_VERSION, MIN_SCORE_RELEVANT } from "../config/matcher.js"

import { saveJobMatch } from "../repositories/job-match-repository.js"

import { listJobs, listJobsPendingAnalysis } from "../repositories/job-repository.js"

import type { JobMatchStatus, StoredJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { avaliarElegibilidadeBrasil } from "./elegibilidade-localizacao.js"

import { matchJob } from "./job-matcher.js"

const TAMANHO_LOTE_ANALISE = 25

function getMatchStatus(score: number): JobMatchStatus {
  return score >= MIN_SCORE_RELEVANT ? "relevant" : "discarded"
}

function cederEventLoop() {
  return new Promise<void>(resolve => {
    setImmediate(resolve)
  })
}

async function analisarVagas(jobs: StoredJob[], perfil: PerfilProfissional) {
  let relevant = 0
  let discarded = 0

  for (let indice = 0; indice < jobs.length; indice++) {
    const job = jobs[indice]

    const elegibilidade = avaliarElegibilidadeBrasil(
      job.location,
      job.description,
      job.title,
      job.remote,
      perfil.localizacoesAceitas
    )

    if (elegibilidade.situacao === "incompativel") {
      await saveJobMatch({
        jobId: job.id,
        localScore: 0,
        matchedSkills: [],
        reasons: [elegibilidade.motivo],
        status: "discarded"
      })

      discarded++
    } else {
      const match = matchJob(job, perfil)
      const status = getMatchStatus(match.score)

      await saveJobMatch({
        jobId: job.id,
        localScore: match.score,
        matchedSkills: match.matchedSkills,
        reasons: match.reasons,
        status
      })

      if (status === "relevant") relevant++
      else discarded++
    }

    if ((indice + 1) % TAMANHO_LOTE_ANALISE === 0) {
      await cederEventLoop()
    }
  }

  return { analyzed: jobs.length, relevant, discarded }
}

export async function analyzePendingJobs(perfil: PerfilProfissional) {
  const jobs = await listJobsPendingAnalysis(MATCHER_VERSION)
  return analisarVagas(jobs, perfil)
}

export async function reanalisarTodasAsVagas(perfil: PerfilProfissional) {
  const jobs = await listJobs()
  return analisarVagas(jobs, perfil)
}
