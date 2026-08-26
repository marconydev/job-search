import { JOB_LIFECYCLE } from "../config/job-lifecycle.js"

import type { NewJob, StoredJob } from "../types/job.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { avaliarElegibilidadeBrasil } from "./elegibilidade-localizacao.js"

import { matchJob } from "./job-matcher.js"

import { avaliarPoliticaVagaBrasil } from "./politica-vagas-brasil.js"

const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000

const LIMITE_EXEMPLOS_QUASE_ADERENTES = 5

export type ExemploQuaseAderente = {
  title: string

  company: string

  score: number

  reason: string
}

export type DiagnosticoFiltragemVagas = {
  recebidas: number

  foraDaJanela: number

  localizacaoIncompativel: number

  politicaBrasilIncompativel: number

  matcherAbaixoDoMinimo: number

  scoreZero: number

  score1a39: number

  score40a49: number

  score50a59: number

  score60OuMais: number

  aderentes: number

  exemplosQuaseAderentes: ExemploQuaseAderente[]
}

export type ResultadoFiltragemVagas = {
  vagasAderentes: NewJob[]

  diagnostico: DiagnosticoFiltragemVagas
}

type ResultadoAvaliacaoVaga =
  | {
      situacao: "fora_da_janela" | "localizacao_incompativel" | "politica_brasil_incompativel"
    }
  | {
      situacao: "matcher_abaixo_do_minimo"

      score: number

      reason: string
    }
  | {
      situacao: "aderente"
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
 * Eu impeço que uma oportunidade com data conhecida e já muito antiga
 * entre novamente no banco como se fosse uma vaga nova.
 *
 * Quando a fonte não informa publishedAt, eu não invento uma data. Nesse
 * caso created_at representa quando encontrei a vaga e o restante do ciclo
 * de vida continua sendo controlado depois pela persistência.
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
   * Eu mantenho datas futuras porque diferenças de relógio ou timezone não
   * são motivo suficiente para descartar uma oportunidade.
   */
  if (idadeEmMilissegundos < 0) {
    return true
  }

  const idadeEmDias = idadeEmMilissegundos / MILISSEGUNDOS_POR_DIA

  return idadeEmDias <= JOB_LIFECYCLE.maxAgeDays
}

function avaliarVagaParaFiltro(
  vaga: NewJob,
  perfil: PerfilProfissional,
  pontuacaoMinima: number,
  agora: Date
): ResultadoAvaliacaoVaga {
  if (!vagaEstaDentroDaJanelaTemporal(vaga, agora)) {
    return {
      situacao: "fora_da_janela"
    }
  }

  const elegibilidade = avaliarElegibilidadeBrasil(vaga.location, vaga.description, vaga.title)

  if (elegibilidade.situacao === "incompativel") {
    return {
      situacao: "localizacao_incompativel"
    }
  }

  const vagaTemporaria = criarVagaTemporaria(vaga)

  const politicaBrasil = avaliarPoliticaVagaBrasil(vagaTemporaria)

  if (!politicaBrasil.permitida) {
    return {
      situacao: "politica_brasil_incompativel"
    }
  }

  const resultado = matchJob(vagaTemporaria, perfil)

  if (resultado.score < pontuacaoMinima) {
    return {
      situacao: "matcher_abaixo_do_minimo",

      score: resultado.score,

      reason: resultado.reasons[0] ?? "Matcher abaixo da pontuação mínima"
    }
  }

  return {
    situacao: "aderente"
  }
}

function criarDiagnostico(recebidas: number): DiagnosticoFiltragemVagas {
  return {
    recebidas,

    foraDaJanela: 0,

    localizacaoIncompativel: 0,

    politicaBrasilIncompativel: 0,

    matcherAbaixoDoMinimo: 0,

    scoreZero: 0,

    score1a39: 0,

    score40a49: 0,

    score50a59: 0,

    score60OuMais: 0,

    aderentes: 0,

    exemplosQuaseAderentes: []
  }
}

function registrarFaixaScore(diagnostico: DiagnosticoFiltragemVagas, score: number) {
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

    return
  }

  diagnostico.score60OuMais++
}

function registrarExemploQuaseAderente(
  diagnostico: DiagnosticoFiltragemVagas,
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

function aplicarResultadoNoDiagnostico(
  diagnostico: DiagnosticoFiltragemVagas,
  vaga: NewJob,
  resultado: ResultadoAvaliacaoVaga
) {
  if (resultado.situacao === "fora_da_janela") {
    diagnostico.foraDaJanela++

    return false
  }

  if (resultado.situacao === "localizacao_incompativel") {
    diagnostico.localizacaoIncompativel++

    return false
  }

  if (resultado.situacao === "politica_brasil_incompativel") {
    diagnostico.politicaBrasilIncompativel++

    return false
  }

  if (resultado.situacao === "matcher_abaixo_do_minimo") {
    diagnostico.matcherAbaixoDoMinimo++

    registrarFaixaScore(diagnostico, resultado.score)

    registrarExemploQuaseAderente(diagnostico, vaga, resultado.score, resultado.reason)

    return false
  }

  diagnostico.aderentes++

  return true
}

/**
 * Eu mantenho esta função simples para usos pequenos e testes que precisam
 * apenas da lista final. A regra de aprovação é a mesma usada no fluxo com
 * diagnóstico.
 */
export function filtrarVagasAderentes(
  vagas: NewJob[],
  perfil: PerfilProfissional,
  pontuacaoMinima = 60
) {
  const agora = new Date()

  return vagas.filter(vaga => {
    return avaliarVagaParaFiltro(vaga, perfil, pontuacaoMinima, agora).situacao === "aderente"
  })
}

function cederEventLoop() {
  return new Promise<void>(resolve => {
    setImmediate(resolve)
  })
}

/**
 * Eu uso esta versão quando preciso entender o funil sem salvar vagas
 * rejeitadas. O diagnóstico existe somente durante a sincronização.
 */
export async function filtrarVagasComDiagnosticoComYield(
  vagas: NewJob[],
  perfil: PerfilProfissional,
  pontuacaoMinima = 60,
  tamanhoLote = 25,
  agora = new Date()
): Promise<ResultadoFiltragemVagas> {
  const vagasAderentes: NewJob[] = []

  const diagnostico = criarDiagnostico(vagas.length)

  const lote = Math.max(1, Math.floor(tamanhoLote))

  for (let indice = 0; indice < vagas.length; indice++) {
    const vaga = vagas[indice]

    const resultado = avaliarVagaParaFiltro(vaga, perfil, pontuacaoMinima, agora)

    if (aplicarResultadoNoDiagnostico(diagnostico, vaga, resultado)) {
      vagasAderentes.push(vaga)
    }

    if ((indice + 1) % lote === 0) {
      await cederEventLoop()
    }
  }

  return {
    vagasAderentes,

    diagnostico
  }
}

/**
 * Eu preservo esta assinatura porque outros fluxos já dependem dela. Assim
 * adiciono observabilidade sem obrigar o restante do projeto a mudar agora.
 */
export async function filtrarVagasAderentesComYield(
  vagas: NewJob[],
  perfil: PerfilProfissional,
  pontuacaoMinima = 60,
  tamanhoLote = 25
) {
  const resultado = await filtrarVagasComDiagnosticoComYield(
    vagas,
    perfil,
    pontuacaoMinima,
    tamanhoLote
  )

  return resultado.vagasAderentes
}
