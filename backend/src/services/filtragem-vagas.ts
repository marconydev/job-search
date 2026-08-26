import { JOB_LIFECYCLE } from "../config/job-lifecycle.js"

import type { NewJob, StoredJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { avaliarElegibilidadeBrasil } from "./elegibilidade-localizacao.js"

import { matchJob } from "./job-matcher.js"

const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000

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
 * Impede que uma oportunidade com data conhecida e já muito antiga
 * entre novamente no banco como se fosse uma vaga nova.
 *
 * Quando a fonte não informa publishedAt, não inventamos uma data.
 * Nesse caso created_at passa a representar quando encontramos a vaga,
 * e o restante do ciclo de vida será controlado depois pela persistência.
 */
export function vagaEstaDentroDaJanelaTemporal(
  vaga: Pick<NewJob, "publishedAt">,
  agora = new Date()
) {
  if (!vaga.publishedAt) {
    return true
  }

  const publicadaEm = new Date(vaga.publishedAt)

  if (Number.isNaN(publicadaEm.getTime())) {
    return true
  }

  const idadeEmMilissegundos = agora.getTime() - publicadaEm.getTime()

  /**
   * Datas futuras podem acontecer por diferenças de relógio ou timezone.
   * Não tratamos isso como motivo para descartar a oportunidade.
   */
  if (idadeEmMilissegundos < 0) {
    return true
  }

  const idadeEmDias = idadeEmMilissegundos / MILISSEGUNDOS_POR_DIA

  return idadeEmDias <= JOB_LIFECYCLE.maxAgeDays
}

function vagaPodeSeguirParaAnalise(vaga: NewJob) {
  if (!vagaEstaDentroDaJanelaTemporal(vaga)) {
    return false
  }

  const elegibilidade = avaliarElegibilidadeBrasil(vaga.location, vaga.description, vaga.title)

  return elegibilidade.situacao !== "incompativel"
}

function vagaEhAderente(vaga: NewJob, perfil: PerfilProfissional, pontuacaoMinima: number) {
  if (!vagaPodeSeguirParaAnalise(vaga)) {
    return false
  }

  const resultado = matchJob(criarVagaTemporaria(vaga), perfil)

  return resultado.score >= pontuacaoMinima
}

/**
 * Mantido para usos pequenos e testes.
 */
export function filtrarVagasAderentes(
  vagas: NewJob[],
  perfil: PerfilProfissional,
  pontuacaoMinima = 60
) {
  return vagas.filter(vaga => vagaEhAderente(vaga, perfil, pontuacaoMinima))
}

/**
 * Libera o event loop para que Express consiga responder:
 *
 * - health checks;
 * - status da sincronização;
 * - demais requisições.
 */
function cederEventLoop() {
  return new Promise<void>(resolve => {
    setImmediate(resolve)
  })
}

/**
 * Versão apropriada para coletas grandes.
 *
 * Em vez de processar centenas de vagas em um único bloco síncrono,
 * trabalho em pequenos lotes e devolvo o controle ao Node entre eles.
 */
export async function filtrarVagasAderentesComYield(
  vagas: NewJob[],
  perfil: PerfilProfissional,
  pontuacaoMinima = 60,
  tamanhoLote = 25
) {
  const aderentes: NewJob[] = []

  const lote = Math.max(1, Math.floor(tamanhoLote))

  for (let indice = 0; indice < vagas.length; indice++) {
    const vaga = vagas[indice]

    if (vagaEhAderente(vaga, perfil, pontuacaoMinima)) {
      aderentes.push(vaga)
    }

    if ((indice + 1) % lote === 0) {
      await cederEventLoop()
    }
  }

  return aderentes
}
