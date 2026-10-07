import { coletarFonteAts } from "../collectors/ats.js"

import { classificarPagina } from "../discovery/page-classifier.js"

import {
  listarFontesAtsParaColeta,
  registrarFalhaColetaFonteAts,
  registrarFonteAts,
  registrarSucessoColetaFonteAts
} from "../repositories/fonte-ats-repository.js"

import {
  listJobs,
  reconcileCompleteSourceAvailability,
  refreshExistingJobs
} from "../repositories/job-repository.js"

import type { PaginaClassificada } from "../types/discovery.js"

import type { NovaFonteAts } from "../types/fonte-ats.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import {
  diagnosticarFunilVagasComYield,
  filtrarVagasAderentes,
  type DiagnosticoFunilVagas
} from "./filtragem-vagas.js"

import { registrarTelemetriaFonte } from "../repositories/funil-telemetria-repository.js"

import { importJobs, type JobImportResult } from "./job-import.js"

export type ResultadoFonteAts = JobImportResult & {
  matched: number

  error?: string
}

const SUBDOMINIOS_INHIRE_RESERVADOS = new Set([
  "www",
  "api",
  "auth",
  "app",
  "status",
  "login",
  "admin",
  "portal",
  "board",
  "people",
  "preview",
  "files",
  "docs",
  "email",
  "analytics",
  "carreiras"
])

function obterPrimeiroSegmento(url: URL) {
  const segmento = url.pathname.split("/").filter(Boolean)[0]

  if (!segmento) {
    return null
  }

  try {
    const decodificado = decodeURIComponent(segmento).trim()

    return decodificado || null
  } catch {
    const original = segmento.trim()

    return original || null
  }
}

function identificarFonteWorkable(
  pagina: PaginaClassificada,
  url: URL,
  hostname: string
): NovaFonteAts | null {
  const sufixo = ".workable.com"

  if (
    hostname.endsWith(sufixo) &&
    !["apply.workable.com", "jobs.workable.com", "api.workable.com", "help.workable.com"].includes(
      hostname
    )
  ) {
    const identificador = hostname.slice(0, -sufixo.length)

    if (identificador && !identificador.includes(".")) {
      return {
        provedor: "workable",

        identificador,

        variante: "padrao",

        urlOrigem: pagina.url
      }
    }
  }

  if (hostname === "apply.workable.com") {
    const segmentos = url.pathname.split("/").filter(Boolean)

    const candidato = segmentos[0]

    if (!candidato) {
      return null
    }

    const reservados = new Set(["j", "job", "jobs", "view", "apply"])

    if (reservados.has(candidato.toLowerCase())) {
      return null
    }

    return {
      provedor: "workable",

      identificador: candidato,

      variante: "padrao",

      urlOrigem: pagina.url
    }
  }

  return null
}

function identificarFonteInHire(pagina: PaginaClassificada, hostname: string): NovaFonteAts | null {
  const sufixo = ".inhire.app"

  if (!hostname.endsWith(sufixo)) {
    return null
  }

  const identificador = hostname.slice(0, -sufixo.length).trim()

  if (
    !identificador ||
    identificador.includes(".") ||
    SUBDOMINIOS_INHIRE_RESERVADOS.has(identificador)
  ) {
    return null
  }

  return {
    provedor: "inhire",

    identificador,

    variante: "padrao",

    urlOrigem: pagina.url
  }
}

export function identificarFonteAtsDaPagina(pagina: PaginaClassificada): NovaFonteAts | null {
  try {
    const url = new URL(pagina.url)

    const hostname = url.hostname.toLowerCase().replace(/^www\./, "")

    /**
     * A InHire ainda pode chegar classificada como página desconhecida.
     * Identifico o tenant pelo hostname porque a coleta direta depende
     * somente do subdomínio público da empresa.
     */
    const fonteInHire = identificarFonteInHire(pagina, hostname)

    if (fonteInHire) {
      return fonteInHire
    }

    if (pagina.provedor === "lever") {
      const identificador = obterPrimeiroSegmento(url)

      if (!identificador) {
        return null
      }

      return {
        provedor: "lever",

        identificador,

        variante: hostname === "jobs.eu.lever.co" ? "eu" : "global",

        urlOrigem: pagina.url
      }
    }

    if (pagina.provedor === "greenhouse") {
      const identificador = obterPrimeiroSegmento(url)

      if (!identificador) {
        return null
      }

      return {
        provedor: "greenhouse",

        identificador,

        variante: "padrao",

        urlOrigem: pagina.url
      }
    }

    if (pagina.provedor === "workable") {
      return identificarFonteWorkable(pagina, url, hostname)
    }

    if (pagina.provedor === "ashby") {
      const identificador = obterPrimeiroSegmento(url)

      if (!identificador) {
        return null
      }

      return {
        provedor: "ashby",

        identificador,

        variante: "padrao",

        urlOrigem: pagina.url
      }
    }

    if (pagina.provedor === "recruitee" || hostname.endsWith(".recruitee.com")) {
      const sufixo = ".recruitee.com"

      if (!hostname.endsWith(sufixo)) {
        return null
      }

      const identificador = hostname.slice(0, -sufixo.length)

      if (!identificador || identificador === "www") {
        return null
      }

      return {
        provedor: "recruitee",

        identificador,

        variante: "padrao",

        urlOrigem: pagina.url
      }
    }

    return null
  } catch {
    return null
  }
}

function extrairFontesAts(paginas: PaginaClassificada[]) {
  const fontes = new Map<string, NovaFonteAts>()

  for (const pagina of paginas) {
    const fonte = identificarFonteAtsDaPagina(pagina)

    if (!fonte) {
      continue
    }

    const chave = [fonte.provedor, fonte.identificador, fonte.variante].join(":")

    fontes.set(chave, fonte)
  }

  return fontes
}

async function persistirFontesAts(paginas: PaginaClassificada[]) {
  const fontes = extrairFontesAts(paginas)

  for (const fonte of fontes.values()) {
    await registrarFonteAts(fonte)
  }

  return fontes.size
}

export async function registrarFontesAtsDescobertas(paginas: PaginaClassificada[]) {
  const quantidade = await persistirFontesAts(paginas)

  if (quantidade > 0) {
    console.log(`ATS: ${quantidade} fonte(s) reconhecida(s) na descoberta web/cache.`)
  }

  return quantidade
}

export async function registrarFontesAtsDosJobsExistentes() {
  const vagas = await listJobs()

  if (vagas.length === 0) {
    return 0
  }

  const paginas = vagas.map(vaga =>
    classificarPagina({
      origem: "banco",

      consulta: "historico",

      titulo: vaga.title,

      url: vaga.url,

      descricao: vaga.description
    })
  )

  const quantidade = await persistirFontesAts(paginas)

  if (quantidade > 0) {
    console.log(`ATS: ${quantidade} fonte(s) reconhecida(s) usando vagas já existentes no banco.`)
  }

  return quantidade
}

function obterNomeFonte(provedor: string, identificador: string) {
  return `ats:${provedor}:${identificador}`
}

function registrarDiagnosticoFonteAts(fonte: string, diagnostico: DiagnosticoFunilVagas) {
  console.log(
    [
      `Funil fonte: ${fonte}`,
      `recebidas=${diagnostico.recebidas}`,
      `fora_janela=${diagnostico.foraDaJanela}`,
      `localizacao=${diagnostico.localizacaoIncompativel}`,
      `titulo_fora_foco=${diagnostico.tituloForaFoco}`,
      `matcher=${diagnostico.matcherAbaixoDoMinimo}`,
      `score_0=${diagnostico.scoreZero}`,
      `score_1_39=${diagnostico.score1a39}`,
      `score_40_49=${diagnostico.score40a49}`,
      `score_50_59=${diagnostico.score50a59}`,
      `aderentes=${diagnostico.aderentes}`,
      `divergencias=${diagnostico.divergencias}`
    ].join(" | ")
  )

  for (const exemplo of diagnostico.exemplosQuaseAderentes) {
    console.log(
      `Quase aderente: ${fonte} | score=${exemplo.score} | ` +
        `${exemplo.title} | ${exemplo.company} | ${exemplo.reason}`
    )
  }
}

/**
 * Consulto diretamente os boards já aprendidos.
 *
 * Uma coleta também funciona como confirmação de disponibilidade:
 *
 * - vagas presentes recebem last_seen_at;
 * - vagas que reaparecem deixam de estar indisponíveis;
 * - se a leitura do board foi completa, vagas ausentes são marcadas
 *   como indisponíveis.
 */
export async function coletarFontesAtsAprendidas(
  perfil: PerfilProfissional,
  limiteFontes = 40,
  limiteVagasPorFonte = 500,
  execucaoId?: string
): Promise<ResultadoFonteAts[]> {
  const fontes = await listarFontesAtsParaColeta(limiteFontes)

  const resultados: ResultadoFonteAts[] = []

  if (fontes.length === 0) {
    console.log("ATS: nenhuma fonte aprendida disponível para coleta.")

    return resultados
  }

  console.log("")

  console.log(`ATS: iniciando coleta direta de ${fontes.length} fonte(s).`)

  for (const fonte of fontes) {
    const nomeFonte = obterNomeFonte(fonte.provedor, fonte.identificador)

    try {
      console.log("")

      console.log(`ATS: coletando ${fonte.provedor} / ${fonte.identificador}`)

      const coleta = await coletarFonteAts(fonte, limiteVagasPorFonte)

      const quantidadeBruta = coleta.jobs.length

      const atualizacao = await refreshExistingJobs(coleta.jobs, coleta.sourceKey)

      if (atualizacao.updated > 0 || atualizacao.invalidated > 0) {
        console.log(
          [
            `ATS: ${fonte.provedor}/${fonte.identificador}`,
            `${atualizacao.updated} vaga(s) existente(s) atualizada(s),`,
            `${atualizacao.invalidated} marcada(s) para reanálise.`
          ].join(" ")
        )
      }

      const vagasAderentes = filtrarVagasAderentes(coleta.jobs, perfil)

      const importacao = await importJobs({
        source: coleta.source,

        sourceKey: coleta.sourceKey,

        jobs: vagasAderentes
      })

      let indisponiveis = 0

      /**
       * Só comparo ausências quando tenho certeza de que percorri a origem
       * inteira. Uma resposta truncada nunca é tratada como encerramento.
       */
      if (coleta.complete === true && coleta.sourceKey) {
        indisponiveis = await reconcileCompleteSourceAvailability(coleta.sourceKey, coleta.jobs)
      }

      await registrarSucessoColetaFonteAts(fonte.id, vagasAderentes.length)

      resultados.push({
        ...importacao,

        found: quantidadeBruta,

        matched: vagasAderentes.length
      })

      console.log(
        [
          `ATS: ${fonte.provedor}/${fonte.identificador}`,
          `${quantidadeBruta} encontrada(s),`,
          `${vagasAderentes.length} aderente(s),`,
          `${importacao.inserted} nova(s),`,
          `${importacao.duplicates} duplicada(s),`,
          `${indisponiveis} encerrada(s).`
        ].join(" ")
      )

      /**
       * Eu executo o diagnóstico somente depois que atualização, filtro,
       * importação, reconciliação, contadores e sucesso da fonte já foram
       * definidos. Uma falha aqui nunca muda o resultado produtivo.
       */
      try {
        const diagnostico = await diagnosticarFunilVagasComYield(
          coleta.jobs,
          perfil,
          vagasAderentes
        )

        registrarDiagnosticoFonteAts(nomeFonte, diagnostico)

        if (execucaoId) {
          try {
            await registrarTelemetriaFonte({
              execucaoId,

              fonte: nomeFonte,

              coletadas: diagnostico.recebidas,

              aposJanela: diagnostico.recebidas - diagnostico.foraDaJanela,

              aposElegibilidade:
                diagnostico.recebidas -
                diagnostico.foraDaJanela -
                diagnostico.localizacaoIncompativel,

              aposMatcher: diagnostico.aderentes,

              importadas: importacao.inserted,

              duplicadas: importacao.duplicates,

              descartes: {
                foraDaJanela: diagnostico.foraDaJanela,
                localizacaoIncompativel: diagnostico.localizacaoIncompativel,
                tituloForaFoco: diagnostico.tituloForaFoco,
                matcherAbaixoDoMinimo: diagnostico.matcherAbaixoDoMinimo,
                scoreZero: diagnostico.scoreZero,
                score1a39: diagnostico.score1a39,
                score40a49: diagnostico.score40a49,
                score50a59: diagnostico.score50a59
              }
            })
          } catch (erroTelemetria) {
            console.warn(
              "Telemetria da fonte " + nomeFonte + " nao registrada:",
              erroTelemetria
            )
          }
        }
      } catch (erroDiagnostico) {
        const mensagem =
          erroDiagnostico instanceof Error ? erroDiagnostico.message : "Erro desconhecido"

        console.warn(`Diagnóstico da fonte ${nomeFonte} não foi concluído: ${mensagem}`)
      }
    } catch (erro) {
      const mensagem =
        erro instanceof Error ? erro.message : "Erro desconhecido durante a coleta ATS"

      await registrarFalhaColetaFonteAts(fonte.id, mensagem)

      resultados.push({
        source: nomeFonte,

        found: 0,

        matched: 0,

        inserted: 0,

        duplicates: 0,

        error: mensagem
      })

      console.error(`ATS: falha em ${fonte.provedor}/${fonte.identificador}: ${mensagem}`)
    }
  }

  const totalEncontradas = resultados.reduce((total, resultado) => total + resultado.found, 0)

  const totalAderentes = resultados.reduce((total, resultado) => total + resultado.matched, 0)

  const totalNovas = resultados.reduce((total, resultado) => total + resultado.inserted, 0)

  const totalDuplicadas = resultados.reduce((total, resultado) => total + resultado.duplicates, 0)

  const totalFalhas = resultados.filter(resultado => Boolean(resultado.error)).length

  console.log("")

  console.log(
    [
      "ATS: coleta concluída.",
      `${fontes.length} fonte(s) consultada(s),`,
      `${totalEncontradas} vaga(s) encontrada(s),`,
      `${totalAderentes} aderente(s),`,
      `${totalNovas} nova(s),`,
      `${totalDuplicadas} duplicada(s),`,
      `${totalFalhas} fonte(s) com falha.`
    ].join(" ")
  )

  return resultados
}
