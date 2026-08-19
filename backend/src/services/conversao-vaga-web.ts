import type { PaginaClassificada, ProvedorPagina } from "../types/discovery.js"

import type { VagaExtraida } from "../types/page-inspection.js"

import type { NewJob as NovaVaga } from "../types/job.js"

/**
 * Removo parâmetros de rastreamento da URL usada como identificação.
 *
 * Quero que a mesma vaga continue com o mesmo identificador mesmo
 * quando aparecer com parâmetros diferentes em outra pesquisa.
 */
function normalizarUrlIdentificacao(url: string) {
  try {
    const urlNormalizada = new URL(url)

    urlNormalizada.search = ""
    urlNormalizada.hash = ""

    urlNormalizada.pathname = urlNormalizada.pathname.replace(/\/+$/, "") || "/"

    return urlNormalizada.toString()
  } catch {
    return url
  }
}

/**
 * Tento usar o identificador nativo de cada ATS antes de recorrer
 * à URL completa como chave.
 */
function gerarIdentificadorExterno(provedor: ProvedorPagina, url: string) {
  try {
    const urlAnalisada = new URL(url)

    const partes = urlAnalisada.pathname.split("/").filter(Boolean)

    if (provedor === "lever") {
      return partes[1] ?? normalizarUrlIdentificacao(url)
    }

    if (provedor === "greenhouse") {
      const indiceJobs = partes.findIndex(parte => parte.toLowerCase() === "jobs")

      return partes[indiceJobs + 1] ?? normalizarUrlIdentificacao(url)
    }

    if (provedor === "workable") {
      const indiceCodigo = partes.findIndex(parte => parte.toLowerCase() === "j")

      return partes[indiceCodigo + 1] ?? normalizarUrlIdentificacao(url)
    }

    if (provedor === "smartrecruiters") {
      const identificador = partes[1]

      const correspondencia = identificador?.match(/^(\d+|[0-9a-f-]{20,})/i)

      return correspondencia?.[1] ?? identificador ?? normalizarUrlIdentificacao(url)
    }

    if (provedor === "gupy") {
      const indiceVaga = partes.findIndex(parte => {
        const valor = parte.toLowerCase()

        return valor === "job" || valor === "jobs"
      })

      return partes[indiceVaga + 1] ?? normalizarUrlIdentificacao(url)
    }

    if (provedor === "solides") {
      const indiceVaga = partes.findIndex(
        parte =>
          parte.toLowerCase() === "vaga"
      )

      return (
        partes[indiceVaga + 1] ??
        normalizarUrlIdentificacao(url)
      )
    }

    return normalizarUrlIdentificacao(url)
  } catch {
    return normalizarUrlIdentificacao(url)
  }
}

/**
 * Uso informações da própria página descoberta apenas como alternativa
 * quando o extrator do ATS não informou o nome da empresa.
 */
function inferirEmpresa(pagina: PaginaClassificada): string | null {
  const titulo = pagina.titulo.trim()

  if (pagina.provedor === "lever") {
    const separador = titulo.indexOf(" - ")

    if (separador > 0) {
      return titulo.slice(0, separador).trim() || null
    }
  }

  if (pagina.provedor === "workable") {
    const partes = titulo
      .split(" - ")
      .map(parte => parte.trim())
      .filter(Boolean)

    if (partes.length >= 2) {
      return partes[partes.length - 1] ?? null
    }
  }
  if (pagina.provedor === "linkedin") {
    const ingles = titulo.match(/^(.*?)\s+hiring\s+/i)

    if (ingles?.[1]) {
      return ingles[1].trim()
    }

    const portugues = titulo.match(/^A empresa\s+(.+?)\s+est[aá]\s+contratando/i)

    if (portugues?.[1]) {
      return portugues[1].trim()
    }

    const formatoAt = titulo.match(/\sat\s+(.+?)(?:\s+-\s|$)/i)

    if (formatoAt?.[1]) {
      return formatoAt[1].trim()
    }
  }
  return null
}

/**
 * Converto a vaga extraída para o formato que a camada atual de
 * persistência já espera.
 *
 * Se faltar título, empresa ou descrição, prefiro não gravar um registro
 * incompleto e deixo essa oportunidade para enriquecimento posterior.
 */
export function converterVagaWebParaNovaVaga(
  pagina: PaginaClassificada,
  vaga: VagaExtraida,
  urlFinal: string
): NovaVaga | null {
  const titulo = vaga.titulo?.trim()

  const empresa = vaga.empresa?.trim() ?? inferirEmpresa(pagina)

  const descricao = vaga.descricao?.trim()

  const url = vaga.urlCandidatura?.trim() || urlFinal

  if (!titulo || !empresa || !descricao || !url) {
    return null
  }

  return {
    source: pagina.provedor,

    externalId: gerarIdentificadorExterno(pagina.provedor, urlFinal),

    company: empresa,

    title: titulo,

    description: descricao,

    location: vaga.localizacao,

    remote: vaga.remoto,

    url,

    publishedAt: vaga.dataPublicacao
  }
}
