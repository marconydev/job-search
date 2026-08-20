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
 * Somente uma incompatibilidade geográfica comprovada elimina a vaga.
 *
 * Uma localização indefinida não significa que a oportunidade seja
 * incompatível com o Brasil.
 *
 * Exemplos que continuam:
 *
 * - Remote
 * - localização ausente
 * - Worldwide
 * - LATAM
 *
 * Exemplos descartados:
 *
 * - Lisboa, Portugal
 * - Lithuania
 * - "except Brazil"
 * - exigência de residência em outro país
 */
function vagaPodeSeguirParaAnalise(vaga: NewJob) {
  const elegibilidade = avaliarElegibilidadeBrasil(
    vaga.location,
    vaga.description,
    vaga.title
  )

  return elegibilidade.situacao !== "incompativel"
}

/**
 * Faço apenas uma triagem de segurança antes da persistência.
 *
 * Não tento decidir prematuramente que uma vaga é brasileira quando
 * faltam informações. O matcher fará o ranking e continuará impedindo
 * que vagas explicitamente estrangeiras sejam consideradas relevantes.
 */
export function filtrarVagasAderentes(
  vagas: NewJob[],
  perfil: PerfilProfissional,
  pontuacaoMinima = 60
) {
  return vagas.filter(vaga => {
    if (!vagaPodeSeguirParaAnalise(vaga)) {
      return false
    }

    const resultado = matchJob(
      criarVagaTemporaria(vaga),
      perfil
    )

    return resultado.score >= pontuacaoMinima
  })
}