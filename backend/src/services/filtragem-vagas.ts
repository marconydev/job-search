import type { NewJob, StoredJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { avaliarElegibilidadeBrasil } from "./elegibilidade-localizacao.js"

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
 * Localização é um pré-requisito, não um componente opcional do score.
 *
 * Eu só deixo a vaga chegar ao matcher quando consigo confirmar que ela
 * pertence ao Brasil.
 *
 * "Remote", "Worldwide", "LATAM" ou localização indefinida não passam.
 */
function vagaEhDoBrasil(vaga: NewJob) {
  const elegibilidade = avaliarElegibilidadeBrasil(vaga.location, vaga.description, vaga.title)

  return elegibilidade.situacao === "compativel"
}

/**
 * Eu filtro antes da persistência.
 *
 * Primeiro valido território brasileiro e somente depois calculo a
 * aderência profissional.
 */
export function filtrarVagasAderentes(
  vagas: NewJob[],
  perfil: PerfilProfissional,
  pontuacaoMinima = 60
) {
  return vagas.filter(vaga => {
    if (!vagaEhDoBrasil(vaga)) {
      return false
    }

    const resultado = matchJob(criarVagaTemporaria(vaga), perfil)

    return resultado.score >= pontuacaoMinima
  })
}
