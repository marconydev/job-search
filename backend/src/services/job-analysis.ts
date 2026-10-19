import { MATCHER_VERSION, MIN_SCORE_RELEVANT } from "../config/matcher.js"

import { saveJobMatch } from "../repositories/job-match-repository.js"

import { listJobs, listJobsPendingAnalysis } from "../repositories/job-repository.js"

import type { JobMatchStatus, StoredJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { avaliarElegibilidadeBrasil } from "./elegibilidade-localizacao.js"

import { matchJob } from "./job-matcher.js"
import { salvarAmostraDescarte } from "../repositories/descartes-amostra-repository.js"
import { createHash } from "node:crypto"

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
  const perfilHash = createHash("sha256").update(JSON.stringify(perfil)).digest("hex").slice(0, 16);
  let relevant = 0
  let discarded = 0

  const agora = new Date().getTime();
  const JANELA_DIAS = 21;
  const isEstagio = (titulo: string) => /\b(estágio|estagiário|intern|trainee)\b/i.test(titulo);

  for (let indice = 0; indice < jobs.length; indice++) {
    const job = jobs[indice]

    const dataPub = job.published_at ? new Date(job.published_at).getTime() : null;
    // Sólides e outros portais nacionais não enviam publishedAt (só createdAt).
    // Nesse caso, não podemos descartar por tempo (Zero Zumbis não se aplica).
    const fonteSemData = job.source === "solides" || job.source === "vagas";
    const expiradaPorData = dataPub && (agora - dataPub) > JANELA_DIAS * 24 * 60 * 60 * 1000;

    if (expiradaPorData || (!dataPub && !fonteSemData)) {
      await saveJobMatch({ jobId: job.id, localScore: 0, matchedSkills: [], reasons: ["Vaga expirada ou sem data."], status: "discarded" });
      discarded++;
      continue;
    }

    if (isEstagio(job.title)) {
      await saveJobMatch({ jobId: job.id, localScore: 0, matchedSkills: [], reasons: ["Vaga de estágio/trainee ignorada."], status: "discarded" });
      discarded++;
      continue;
    }

    const elegibilidade = avaliarElegibilidadeBrasil(
      job.location,
      job.description,
      job.title,
      job.remote,
      perfil.localizacoesAceitas,
      job.workplace_type,
      job.source
    )

    const match = matchJob(job, perfil)
    let status = getMatchStatus(match.score)
    let isIncompativel = elegibilidade.situacao === "incompativel"

    // Blindagem: score muito alto (>= 80) nunca e descartado por localizacao
    if (match.score >= 80) {
      isIncompativel = false
      status = "relevant"
    }

    if (isIncompativel) {
      await saveJobMatch({
        jobId: job.id,
        localScore: 0,
        matchedSkills: [],
        reasons: [elegibilidade.motivo],
        status: "discarded",
        perfilHash
      })
      discarded++
    } else {
      // Blindagem: portais nacionais (Sólides/Gupy/Vagas) com score >= 60
      const isFonteNacional = ["solides", "gupy", "vagas"].includes(job.source)
      if (isFonteNacional && match.score >= MIN_SCORE_RELEVANT) {
        status = "relevant"
      }

      await saveJobMatch({
        jobId: job.id,
        localScore: match.score,
        matchedSkills: match.matchedSkills,
        reasons: match.reasons,
        status,
        perfilHash
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
