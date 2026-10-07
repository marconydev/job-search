import { JOB_LIFECYCLE } from "../config/job-lifecycle.js"
import { MIN_SCORE_RELEVANT } from "../config/matcher.js"

import type { NewJob, StoredJob } from "../types/job.js"
import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { avaliarElegibilidadeBrasil } from "./elegibilidade-localizacao.js"
import { matchJob } from "./job-matcher.js"

const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000
const LIMITE_EXEMPLOS_QUASE_ADERENTES = 5

export type DiagnosticoFunilVagas = {
  recebidas: number
  foraDaJanela: number
  localizacaoIncompativel: number
  tituloForaFoco: number
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
    workplace_type: vaga.workplaceType ?? "unknown",
    url: vaga.url,
    published_at: vaga.publishedAt,
    partial: vaga.partial ?? false,
    created_at: new Date().toISOString()
  }
}

export function vagaEstaDentroDaJanelaTemporal(
  vaga: Pick<NewJob, "publishedAt">,
  agora = new Date()
) {
  if (!vaga.publishedAt) return true
  const publicadaEm = new Date(vaga.publishedAt)
  if (Number.isNaN(publicadaEm.getTime())) return true
  const idade = agora.getTime() - publicadaEm.getTime()
  if (idade < 0) return true
  return idade / MILISSEGUNDOS_POR_DIA <= JOB_LIFECYCLE.maxAgeDays
}

function vagaPodeSeguirParaAnalise(vaga: NewJob, perfil: PerfilProfissional) {
  if (!vagaEstaDentroDaJanelaTemporal(vaga)) return false
  const elegibilidade = avaliarElegibilidadeBrasil(
    vaga.location,
    vaga.description,
    vaga.title,
    vaga.remote,
    perfil.localizacoesAceitas
  )
  return elegibilidade.situacao !== "incompativel"
}

function vagaEhAderente(vaga: NewJob, perfil: PerfilProfissional, pontuacaoMinima: number) {
  if (!vagaPodeSeguirParaAnalise(vaga, perfil)) return false
  const resultado = matchJob(criarVagaTemporaria(vaga), perfil)
  return resultado.score >= pontuacaoMinima
}

export function filtrarVagasAderentes(
  vagas: NewJob[],
  perfil: PerfilProfissional,
  pontuacaoMinima = MIN_SCORE_RELEVANT
) {
  return vagas.filter(vaga => vagaEhAderente(vaga, perfil, pontuacaoMinima))
}

function cederEventLoop() {
  return new Promise<void>(resolve => { setImmediate(resolve) })
}

export async function filtrarVagasAderentesComYield(
  vagas: NewJob[],
  perfil: PerfilProfissional,
  pontuacaoMinima = MIN_SCORE_RELEVANT,
  tamanhoLote = 25
) {
  const aderentes: NewJob[] = []
  const lote = Math.max(1, Math.floor(tamanhoLote))

  for (let indice = 0; indice < vagas.length; indice++) {
    const vaga = vagas[indice]
    if (vagaEhAderente(vaga, perfil, pontuacaoMinima)) aderentes.push(vaga)
    if ((indice + 1) % lote === 0) await cederEventLoop()
  }

  return aderentes
}

function criarDiagnostico(recebidas: number): DiagnosticoFunilVagas {
  return {
    recebidas,
    foraDaJanela: 0,
    localizacaoIncompativel: 0,
    tituloForaFoco: 0,
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

function registrarFaixaScore(d: DiagnosticoFunilVagas, score: number) {
  if (score <= 0) return void d.scoreZero++
  if (score <= 39) return void d.score1a39++
  if (score <= 49) return void d.score40a49++
  if (score <= 59) return void d.score50a59++
}

function registrarQuaseAderente(
  d: DiagnosticoFunilVagas,
  vaga: NewJob,
  score: number,
  reason: string
) {
  if (score < 40) return
  d.exemplosQuaseAderentes.push({
    title: vaga.title,
    company: vaga.company,
    score,
    reason
  })
  d.exemplosQuaseAderentes.sort((a, b) => b.score - a.score)
  if (d.exemplosQuaseAderentes.length > LIMITE_EXEMPLOS_QUASE_ADERENTES) {
    d.exemplosQuaseAderentes.length = LIMITE_EXEMPLOS_QUASE_ADERENTES
  }
}

export async function diagnosticarFunilVagasComYield(
  vagas: NewJob[],
  perfil: PerfilProfissional,
  vagasAderentes: NewJob[],
  pontuacaoMinima = MIN_SCORE_RELEVANT,
  tamanhoLote = 25,
  agora = new Date()
): Promise<DiagnosticoFunilVagas> {
  const d = criarDiagnostico(vagas.length)
  const aprovadas = new Set(vagasAderentes)
  const lote = Math.max(1, Math.floor(tamanhoLote))

  for (let indice = 0; indice < vagas.length; indice++) {
    const vaga = vagas[indice]
    if (aprovadas.has(vaga)) {
      d.aderentes++
    } else if (!vagaEstaDentroDaJanelaTemporal(vaga, agora)) {
      d.foraDaJanela++
    } else {
      const elegibilidade = avaliarElegibilidadeBrasil(
        vaga.location,
        vaga.description,
        vaga.title,
        vaga.remote,
        perfil.localizacoesAceitas
      )
      if (elegibilidade.situacao === "incompativel") {
        d.localizacaoIncompativel++
      } else {
        const resultado = matchJob(criarVagaTemporaria(vaga), perfil)
        if (resultado.score < pontuacaoMinima) {
          d.matcherAbaixoDoMinimo++
          registrarFaixaScore(d, resultado.score)
          registrarQuaseAderente(
            d,
            vaga,
            resultado.score,
            resultado.reasons[0] ?? "Matcher abaixo da pontuação mínima"
          )
        } else {
          d.divergencias++
        }
      }
    }
    if ((indice + 1) % lote === 0) await cederEventLoop()
  }

  return d
}
