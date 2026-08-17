import type { NewJob, StoredJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { matchJob } from "./job-matcher.js"

/**
 * Eu converto uma vaga ainda não persistida para o formato que o matcher
 * já conhece.
 *
 * O ID é temporário porque neste ponto a oportunidade ainda não existe
 * no PostgreSQL.
 */
function criarVagaTemporaria(vaga: NewJob): StoredJob {
  return {
    id: 0,

    source: vaga.source,

    external_id: vaga.externalId,

    company: vaga.company,

    title: vaga.title,

    description: vaga.description,

    location: vaga.location,

    remote: vaga.remote,

    url: vaga.url,

    published_at: vaga.publishedAt,

    partial: vaga.partial ?? false,

    created_at: new Date().toISOString()
  }
}

/**
 * Eu filtro antes da persistência.
 *
 * Isso evita armazenar centenas de vagas que o próprio matcher já sabe
 * que não possuem aderência mínima ao perfil profissional.
 */
export function filtrarVagasAderentes(
  vagas: NewJob[],
  perfil: PerfilProfissional,
  pontuacaoMinima = 60
) {
  return vagas.filter(vaga => {
    const resultado = matchJob(criarVagaTemporaria(vaga), perfil)

    return resultado.score >= pontuacaoMinima
  })
}
