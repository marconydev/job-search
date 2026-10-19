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

async function analisarVagas(jobs: StoredJob[], perfil: PerfilProfissional, execucaoId?: string) {
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
    const isGupy = job.source === "gupy";

    if ((expiradaPorData && !isGupy) || (!dataPub && !fonteSemData && !isGupy)) {
      await saveJobMatch({ jobId: job.id, localScore: 0, matchedSkills: [], reasons: ["Vaga expirada ou sem data."], status: "discarded" });
      await salvarAmostraDescarte({ execucaoId: execucaoId || "00000000-0000-0000-0000-000000000000", fonte: job.source, motivo: "expirada", trechoDescricao: job.description?.substring(0, 200) || null, regraDisparada: "Expirada ou sem data" });
      discarded++;
      continue;
    }

    if (isEstagio(job.title)) {
      await saveJobMatch({ jobId: job.id, localScore: 0, matchedSkills: [], reasons: ["Vaga de estágio/trainee ignorada."], status: "discarded" });
      await salvarAmostraDescarte({ execucaoId: execucaoId || "00000000-0000-0000-0000-000000000000", fonte: job.source, motivo: "estagio", trechoDescricao: job.description?.substring(0, 200) || null, regraDisparada: "Estagio/trainee" });
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


    if (isIncompativel) {
      await saveJobMatch({
        jobId: job.id,
        localScore: 0,
        matchedSkills: [],
        reasons: [elegibilidade.motivo],
        status: "discarded",
        perfilHash
      })
            
      await salvarAmostraDescarte({ execucaoId: execucaoId || "00000000-0000-0000-0000-000000000000", fonte: job.source, motivo: elegibilidade.situacao || "incompativel", trechoDescricao: job.description?.substring(0, 200) || null, regraDisparada: elegibilidade.motivo || "Incompativel" });
      discarded++
    } else {
      // Blindagem: portais nacionais (Sólides/Gupy/Vagas) com score >= 60
      const fonteStr = String(job.source || "").toLowerCase();
      const isFonteNacional = fonteStr.includes("solides") || fonteStr.includes("gupy") || fonteStr.includes("vagas");
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
      else {
        match.reasons.push("Score abaixo do corte de " + MIN_SCORE_RELEVANT);
        await salvarAmostraDescarte({ execucaoId: execucaoId || "00000000-0000-0000-0000-000000000000", fonte: job.source, motivo: "score_baixo", trechoDescricao: job.description?.substring(0, 200) || null, regraDisparada: "Score abaixo do minimo" });
        discarded++
      }
    }

    if ((indice + 1) % TAMANHO_LOTE_ANALISE === 0) {
      await cederEventLoop()
    }
  }

  return { analyzed: jobs.length, relevant, discarded }
}

export async function analyzePendingJobs(perfil: PerfilProfissional, execucaoId?: string) {
  const jobs = await listJobsPendingAnalysis(MATCHER_VERSION)
  return analisarVagas(jobs, perfil, execucaoId)
}

export async function reanalisarTodasAsVagas(perfil: PerfilProfissional, execucaoId?: string) {
  const jobs = await listJobs()
  return analisarVagas(jobs, perfil)
}
