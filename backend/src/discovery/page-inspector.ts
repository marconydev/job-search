import {
  identificarProvedorPagina
} from "./page-classifier.js"

import {
  extrairVagaGupy
} from "../extractors/gupy.js"

import {
  extrairVagaLever
} from "../extractors/lever.js"

import {
  extrairVagaGreenhouse
} from "../extractors/greenhouse.js"

import type {
  PaginaClassificada
} from "../types/discovery.js"

import type {
  ResultadoInspecaoPagina,
  VagaExtraida
} from "../types/page-inspection.js"

type ObjetoJsonLd = {
  [chave: string]: unknown
}

const TEMPO_LIMITE_REQUISICAO_MS = 15000

/**
 * Confirmo se o valor recebido pode ser tratado como um objeto.
 */
function ehObjeto(
  valor: unknown
): valor is ObjetoJsonLd {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  )
}

/**
 * Leio um valor textual sem assumir que o campo sempre será uma string.
 */
function lerTexto(
  valor: unknown
): string | null {
  if (typeof valor !== "string") {
    return null
  }

  const texto = valor.trim()

  return texto || null
}

/**
 * Alguns campos externos podem chegar como texto ou lista.
 * Transformo os dois formatos em uma representação única.
 */
function lerListaTexto(
  valor: unknown
): string | null {
  if (
    typeof valor === "string"
  ) {
    return lerTexto(valor)
  }

  if (!Array.isArray(valor)) {
    return null
  }

  const valores = valor
    .filter(
      (item): item is string =>
        typeof item === "string"
    )
    .map(
      (item) => item.trim()
    )
    .filter(Boolean)

  return valores.length > 0
    ? valores.join(", ")
    : null
}

/**
 * Retiro marcações HTML básicas para manter a descrição legível
 * durante a análise de compatibilidade.
 */
function limparDescricao(
  valor: unknown
): string | null {
  const descricao =
    lerTexto(valor)

  if (!descricao) {
    return null
  }

  return descricao
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * Verifico o campo externo "@type" para identificar especificamente
 * um JobPosting dentro dos dados estruturados.
 */
function ehPublicacaoDeVaga(
  valor: ObjetoJsonLd
) {
  const tipo = valor["@type"]

  if (
    typeof tipo === "string"
  ) {
    return (
      tipo.toLowerCase() ===
      "jobposting"
    )
  }

  if (Array.isArray(tipo)) {
    return tipo.some(
      (item) =>
        typeof item === "string" &&
        item.toLowerCase() ===
          "jobposting"
    )
  }

  return false
}

/**
 * Percorro estruturas aninhadas porque alguns sites colocam o
 * JobPosting dentro de "@graph" ou de outros objetos.
 */
function encontrarPublicacaoVaga(
  valor: unknown
): ObjetoJsonLd | null {
  if (Array.isArray(valor)) {
    for (const item of valor) {
      const publicacao =
        encontrarPublicacaoVaga(
          item
        )

      if (publicacao) {
        return publicacao
      }
    }

    return null
  }

  if (!ehObjeto(valor)) {
    return null
  }

  if (
    ehPublicacaoDeVaga(valor)
  ) {
    return valor
  }

  for (
    const filho
    of Object.values(valor)
  ) {
    const publicacao =
      encontrarPublicacaoVaga(
        filho
      )

    if (publicacao) {
      return publicacao
    }
  }

  return null
}

/**
 * Procuro blocos application/ld+json até encontrar um JobPosting válido.
 */
function extrairPublicacaoVagaDoHtml(
  html: string
): ObjetoJsonLd | null {
  const padraoScript =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

  let correspondencia:
    RegExpExecArray | null

  while (
    (
      correspondencia =
        padraoScript.exec(html)
    ) !== null
  ) {
    const conteudo =
      correspondencia[1]?.trim()

    if (!conteudo) {
      continue
    }

    try {
      const dados =
        JSON.parse(
          conteudo
        ) as unknown

      const publicacao =
        encontrarPublicacaoVaga(
          dados
        )

      if (publicacao) {
        return publicacao
      }
    } catch {
      // Ignoro somente o bloco inválido e continuo procurando porque
      // outros scripts da mesma página ainda podem estar corretos.
      continue
    }
  }

  return null
}

/**
 * Extraio a empresa a partir do campo externo hiringOrganization.
 */
function extrairEmpresa(
  publicacao: ObjetoJsonLd
): string | null {
  const organizacao =
    publicacao.hiringOrganization

  if (
    !ehObjeto(organizacao)
  ) {
    return null
  }

  return lerTexto(
    organizacao.name
  )
}

/**
 * Transformo o endereço estruturado em um texto mais simples.
 */
function extrairEndereco(
  valor: unknown
): string | null {
  if (Array.isArray(valor)) {
    const locais = valor
      .map(extrairEndereco)
      .filter(
        (item): item is string =>
          Boolean(item)
      )

    return locais.length > 0
      ? locais.join(" | ")
      : null
  }

  if (!ehObjeto(valor)) {
    return lerTexto(valor)
  }

  const endereco =
    valor.address

  if (
    typeof endereco === "string"
  ) {
    return lerTexto(endereco)
  }

  if (!ehObjeto(endereco)) {
    return lerTexto(
      valor.name
    )
  }

  const cidade =
    lerTexto(
      endereco.addressLocality
    )

  const estado =
    lerTexto(
      endereco.addressRegion
    )

  let pais: string | null = null

  if (
    typeof endereco.addressCountry ===
    "string"
  ) {
    pais =
      lerTexto(
        endereco.addressCountry
      )
  } else if (
    ehObjeto(
      endereco.addressCountry
    )
  ) {
    pais =
      lerTexto(
        endereco.addressCountry.name
      ) ??
      lerTexto(
        endereco.addressCountry["@id"]
      )
  }

  const partes = [
    cidade,
    estado,
    pais
  ].filter(
    (item): item is string =>
      Boolean(item)
  )

  return partes.length > 0
    ? [...new Set(partes)].join(", ")
    : null
}

/**
 * Para vagas remotas, procuro também a região permitida para candidatos.
 */
function extrairLocalCandidato(
  valor: unknown
): string | null {
  if (Array.isArray(valor)) {
    const locais = valor
      .map(
        extrairLocalCandidato
      )
      .filter(
        (item): item is string =>
          Boolean(item)
      )

    return locais.length > 0
      ? locais.join(" | ")
      : null
  }

  if (!ehObjeto(valor)) {
    return lerTexto(valor)
  }

  return (
    lerTexto(valor.name) ??
    extrairEndereco(valor)
  )
}

/**
 * Confirmo trabalho remoto primeiro pelos campos estruturados e uso
 * o conteúdo textual somente como apoio.
 */
function detectarRemoto(
  publicacao: ObjetoJsonLd,
  localizacao: string | null
) {
  const tipoLocal =
    lerListaTexto(
      publicacao.jobLocationType
    )

  if (
    tipoLocal &&
    tipoLocal
      .toLowerCase()
      .includes("telecommute")
  ) {
    return true
  }

  const textoParaAnalise = [
    lerTexto(
      publicacao.title
    ),
    localizacao,
    limparDescricao(
      publicacao.description
    )
  ]
    .filter(
      (item): item is string =>
        Boolean(item)
    )
    .join(" ")
    .toLowerCase()

  return /\b(remote|remoto|remota|home office)\b/i.test(
    textoParaAnalise
  )
}

/**
 * Converto o JobPosting externo para o modelo interno em português.
 */
function normalizarPublicacaoVaga(
  publicacao: ObjetoJsonLd,
  urlFinal: string
): VagaExtraida {
  const localFisico =
    extrairEndereco(
      publicacao.jobLocation
    )

  const localCandidato =
    extrairLocalCandidato(
      publicacao.applicantLocationRequirements
    )

  const localizacao =
    localFisico ??
    localCandidato

  return {
    titulo:
      lerTexto(
        publicacao.title
      ),

    empresa:
      extrairEmpresa(
        publicacao
      ),

    descricao:
      limparDescricao(
        publicacao.description
      ),

    localizacao,

    tipoContratacao:
      lerListaTexto(
        publicacao.employmentType
      ),

    dataPublicacao:
      lerTexto(
        publicacao.datePosted
      ),

    validaAte:
      lerTexto(
        publicacao.validThrough
      ),

    remoto:
      detectarRemoto(
        publicacao,
        localizacao
      ),

    urlCandidatura:
      lerTexto(
        publicacao.url
      ) ??
      urlFinal
  }
}

/**
 * Para plataformas que disponibilizam uma API pública de vagas,
 * tento primeiro essa fonte estruturada.
 *
 * Se a consulta não retornar uma vaga válida, continuo com os métodos
 * genéricos e específicos baseados no HTML.
 */
async function extrairVaga(
  html: string,
  provedor: PaginaClassificada["provedor"],
  urlFinal: string
): Promise<VagaExtraida | null> {
  if (
    provedor === "lever"
  ) {
    const vagaLever =
      await extrairVagaLever(
        urlFinal
      )

    if (vagaLever) {
      return vagaLever
    }
  }

  if (
    provedor === "greenhouse"
  ) {
    const vagaGreenhouse =
      await extrairVagaGreenhouse(
        urlFinal
      )

    if (vagaGreenhouse) {
      return vagaGreenhouse
    }
  }

  const publicacao =
    extrairPublicacaoVagaDoHtml(
      html
    )

  if (publicacao) {
    return normalizarPublicacaoVaga(
      publicacao,
      urlFinal
    )
  }

  if (
    provedor === "gupy"
  ) {
    return extrairVagaGupy(
      html,
      urlFinal
    )
  }

  return null
}

/**
 * Abro uma página encontrada e tento confirmar se ela representa
 * realmente uma oportunidade de emprego.
 *
 * Sigo redirecionamentos normais, mas não tento contornar CAPTCHA,
 * autenticação ou qualquer outro bloqueio aplicado pelo site.
 */
export async function inspecionarPaginaVaga(
  pagina: PaginaClassificada
): Promise<ResultadoInspecaoPagina> {
  const controlador =
    new AbortController()

  const temporizador =
    setTimeout(
      () => {
        controlador.abort()
      },
      TEMPO_LIMITE_REQUISICAO_MS
    )

  try {
    const resposta =
      await fetch(
        pagina.url,
        {
          redirect: "follow",
          signal:
            controlador.signal,
          headers: {
            Accept:
              "text/html,application/xhtml+xml",
            "Accept-Language":
              "pt-BR,pt;q=0.9,en;q=0.8"
          }
        }
      )

    const urlFinal =
      resposta.url ||
      pagina.url

    const provedor =
      identificarProvedorPagina(
        urlFinal
      )

    if (!resposta.ok) {
      return {
        pagina,
        urlFinal,
        provedor,
        codigoStatus:
          resposta.status,
        ehPublicacaoVaga: false,
        vaga: null
      }
    }

    const tipoConteudo =
      resposta.headers.get(
        "content-type"
      ) ?? ""

    if (
      !tipoConteudo
        .toLowerCase()
        .includes("text/html")
    ) {
      return {
        pagina,
        urlFinal,
        provedor,
        codigoStatus:
          resposta.status,
        ehPublicacaoVaga: false,
        vaga: null
      }
    }

    const html =
      await resposta.text()

    const vaga =
      await extrairVaga(
        html,
        provedor,
        urlFinal
      )

    return {
      pagina,
      urlFinal,
      provedor,
      codigoStatus:
        resposta.status,
      ehPublicacaoVaga:
        Boolean(vaga),
      vaga
    }
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro desconhecido durante a inspeção"

    return {
      pagina,
      erro: mensagem
    }
  } finally {
    clearTimeout(
      temporizador
    )
  }
}