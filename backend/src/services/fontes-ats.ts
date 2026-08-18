import { coletarFonteAts } from "../collectors/ats.js"

import { classificarPagina } from "../discovery/page-classifier.js"

import {
  listarFontesAtsParaColeta,
  registrarFalhaColetaFonteAts,
  registrarFonteAts,
  registrarSucessoColetaFonteAts
} from "../repositories/fonte-ats-repository.js"

import { listJobs } from "../repositories/job-repository.js"

import type { PaginaClassificada } from "../types/discovery.js"

import type { NovaFonteAts } from "../types/fonte-ats.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { filtrarVagasAderentes } from "./filtragem-vagas.js"

import { importJobs, type JobImportResult } from "./job-import.js"

export type ResultadoFonteAts = JobImportResult & {
  /**
   * Quantidade de vagas que passou pelo filtro profissional antes da
   * persistência.
   */
  matched: number

  error?: string
}

/**
 * Os segmentos de pathname permanecem codificados pela URL.
 *
 * Eu decodifico o identificador antes de persistir a fonte porque os
 * coletores fazem o encode novamente ao montar a chamada da API.
 *
 * Exemplo:
 *
 * PAR%20Technology
 *        ↓
 * PAR Technology
 *        ↓
 * encodeURIComponent no coletor
 *        ↓
 * PAR%20Technology
 *
 * Se a origem possuir uma codificação inválida, mantenho o valor original
 * em vez de impedir o processamento das demais fontes.
 */
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

  /**
   * Quando a empresa utiliza um hostname próprio do Workable, consigo
   * obter o identificador diretamente pelo subdomínio.
   *
   * Exemplo:
   *
   * empresa.workable.com
   */
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

  /**
   * No formato:
   *
   * apply.workable.com/empresa/j/CODIGO
   *
   * o primeiro segmento realmente representa a conta da empresa.
   */
  if (hostname === "apply.workable.com") {
    const segmentos = url.pathname.split("/").filter(Boolean)

    const candidato = segmentos[0]

    if (!candidato) {
      return null
    }

    /**
     * O formato:
     *
     * apply.workable.com/j/CODIGO
     *
     * é um shortlink e não informa a conta da empresa.
     *
     * Eu nunca transformo "j" em uma fonte ATS.
     */
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

  /**
   * URLs genéricas de jobs.workable.com não possuem obrigatoriamente a
   * conta necessária para usar a API pública.
   *
   * Prefiro não aprender uma fonte incorreta.
   */
  return null
}

/**
 * Eu identifico a conta, organização ou job board que posso consultar
 * diretamente depois.
 *
 * Nenhuma API externa é chamada nesta função.
 */
export function identificarFonteAtsDaPagina(pagina: PaginaClassificada): NovaFonteAts | null {
  try {
    const url = new URL(pagina.url)

    const hostname = url.hostname.toLowerCase().replace(/^www\./, "")

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

/**
 * Uma busca pode retornar várias vagas da mesma empresa.
 *
 * Eu deduplico as fontes em memória antes de tocar no PostgreSQL.
 */
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

/**
 * Eu registro os boards encontrados pela descoberta web ou pelo cache.
 */
export async function registrarFontesAtsDescobertas(paginas: PaginaClassificada[]) {
  const quantidade = await persistirFontesAts(paginas)

  if (quantidade > 0) {
    console.log(`ATS: ${quantidade} fonte(s) reconhecida(s) na descoberta web/cache.`)
  }

  return quantidade
}

/**
 * Eu reaproveito as vagas que já estão no PostgreSQL para aprender ATS
 * sem consumir uma nova chamada Brave.
 */
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

/**
 * Eu consulto diretamente os boards já aprendidos.
 *
 * Todas as vagas retornadas passam pelo matcher em memória antes do
 * INSERT.
 */
export async function coletarFontesAtsAprendidas(
  perfil: PerfilProfissional,
  limiteFontes = 40,
  limiteVagasPorFonte = 500
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

      const vagasAderentes = filtrarVagasAderentes(coleta.jobs, perfil)

      const importacao = await importJobs({
        source: coleta.source,

        jobs: vagasAderentes
      })

      await registrarSucessoColetaFonteAts(fonte.id)

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
          `${importacao.duplicates} duplicada(s).`
        ].join(" ")
      )
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
