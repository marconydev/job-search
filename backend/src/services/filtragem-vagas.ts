import { JOB_LIFECYCLE } from "../config/job-lifecycle.js"

import type { NewJob, StoredJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { avaliarElegibilidadeBrasil } from "./elegibilidade-localizacao.js"

import { matchJob } from "./job-matcher.js"

import { tituloEstaNoFocoBrasil, vagaEstaEmJoaoPessoa } from "./politica-vagas-brasil.js"

const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000

const LIMITE_EXEMPLOS_QUASE_ADERENTES = 5

export type DiagnosticoFunilVagas = {
  recebidas: number

  foraDaJanela: number

  localizacaoIncompativel: number

  tituloForaFoco: number

  naoRemotaForaJoaoPessoa: number

  matcherAbaixoDoMinimo: number

  scoreZero: number

  score1a39: number

  score40a49: number

  score50a59: number

  aderentes: number

  divergencias: number

  exemplosQuaseAderentes: Array<{
    title: string

    company: string

    score: number

    reason: string
  }>
}

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

  const elegibilidade = avaliarElegibilidadeBrasil(
    vaga.location,
    vaga.description,
    vaga.title,
    vaga.remote
  )

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

function criarDiagnostico(recebidas: number): DiagnosticoFunilVagas {
  return {
    recebidas,

    foraDaJanela: 0,

    localizacaoIncompativel: 0,

    tituloForaFoco: 0,

    naoRemotaForaJoaoPessoa: 0,

    matcherAbaixoDoMinimo: 0,

    scoreZero: 0,

    score1a39: 0,

    score40a49: 0,

    score50a59: 0,

    aderentes: 0,

    divergencias: 0,

    exemplosQuaseAderentes: []
  }
}

function registrarFaixaScore(diagnostico: DiagnosticoFunilVagas, score: number) {
  if (score <= 0) {
    diagnostico.scoreZero++

    return
  }

  if (score <= 39) {
    diagnostico.score1a39++

    return
  }

  if (score <= 49) {
    diagnostico.score40a49++

    return
  }

  if (score <= 59) {
    diagnostico.score50a59++
  }
}

function registrarQuaseAderente(
  diagnostico: DiagnosticoFunilVagas,
  vaga: NewJob,
  score: number,
  reason: string
) {
  if (score < 40) {
    return
  }

  diagnostico.exemplosQuaseAderentes.push({
    title: vaga.title,

    company: vaga.company,

    score,

    reason
  })

  diagnostico.exemplosQuaseAderentes.sort((primeiro, segundo) => segundo.score - primeiro.score)

  if (diagnostico.exemplosQuaseAderentes.length > LIMITE_EXEMPLOS_QUASE_ADERENTES) {
    diagnostico.exemplosQuaseAderentes.length = LIMITE_EXEMPLOS_QUASE_ADERENTES
  }
}

/**
 * Eu observo o resultado do filtro depois que ele já decidiu as vagas
 * aderentes. Esta função não devolve vagas para importação e não participa
 * de nenhuma decisão do fluxo principal.
 */
export async function diagnosticarFunilVagasComYield(
  vagas: NewJob[],
  perfil: PerfilProfissional,
  vagasAderentes: NewJob[],
  pontuacaoMinima = 60,
  tamanhoLote = 25,
  agora = new Date()
): Promise<DiagnosticoFunilVagas> {
  const diagnostico = criarDiagnostico(vagas.length)

  const aprovadas = new Set(vagasAderentes)

  const lote = Math.max(1, Math.floor(tamanhoLote))

  for (let indice = 0; indice < vagas.length; indice++) {
    const vaga = vagas[indice]

    /**
     * Eu considero a lista produzida pelo filtro original como fonte da
     * verdade. O diagnóstico nunca reclassifica uma vaga já aprovada.
     */
    if (aprovadas.has(vaga)) {
      diagnostico.aderentes++
    } else if (!vagaEstaDentroDaJanelaTemporal(vaga, agora)) {
      diagnostico.foraDaJanela++
    } else {
      const elegibilidade = avaliarElegibilidadeBrasil(
        vaga.location,
        vaga.description,
        vaga.title,
        vaga.remote
      )

      if (elegibilidade.situacao === "incompativel") {
        diagnostico.localizacaoIncompativel++
      } else if (!tituloEstaNoFocoBrasil(vaga.title)) {
        diagnostico.tituloForaFoco++
      } else if (!vaga.remote && !vagaEstaEmJoaoPessoa(vaga)) {
        diagnostico.naoRemotaForaJoaoPessoa++
      } else {
        const resultado = matchJob(criarVagaTemporaria(vaga), perfil)

        if (resultado.score < pontuacaoMinima) {
          diagnostico.matcherAbaixoDoMinimo++

          registrarFaixaScore(diagnostico, resultado.score)

          registrarQuaseAderente(
            diagnostico,
            vaga,
            resultado.score,
            resultado.reasons[0] ?? "Matcher abaixo da pontuação mínima"
          )
        } else {
          /**
           * Se o observador discordar do filtro original, eu apenas registro
           * a divergência. A vaga não é incluída nem removida por causa disso.
           */
          diagnostico.divergencias++
        }
      }
    }

    if ((indice + 1) % lote === 0) {
      await cederEventLoop()
    }
  }

  return diagnostico
}
