import * as cheerio from "cheerio"

import type {
  VagaExtraida
} from "../types/page-inspection.js"

/**
 * Mantenho os nomes exatamente como a Lever devolve porque estes
 * campos pertencem ao contrato externo da API.
 */
type RespostaLever = {
  text?: string
  descriptionPlain?: string
  openingPlain?: string
  additionalPlain?: string

  categories?: {
    location?: string
    commitment?: string
    team?: string
    department?: string
    allLocations?: string[]
  }

  lists?: Array<{
    text?: string
    content?: string
  }>

  country?: string | null
  hostedUrl?: string
  applyUrl?: string

  workplaceType?:
    | "unspecified"
    | "on-site"
    | "remote"
    | "hybrid"
}

type DadosUrlLever = {
  site: string
  idVaga: string
  urlApi: string
}

/**
 * Normalizo textos vindos da API sem alterar o conteúdo relevante
 * para a análise da vaga.
 */
function normalizarTexto(
  valor: string | undefined
): string | null {
  const texto = valor?.trim()

  return texto || null
}

/**
 * Converto pequenos trechos HTML retornados pela Lever em texto simples.
 */
function converterHtmlParaTexto(
  html: string | undefined
): string | null {
  if (!html) {
    return null
  }

  const $ = cheerio.load(html)

  const texto = $.root()
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return texto || null
}

/**
 * Extraio o identificador da empresa e da vaga diretamente da URL
 * hospedada pela Lever.
 *
 * Também reconheço a instância europeia porque a própria Lever mantém
 * endpoints separados para a região global e para a Europa.
 */
function interpretarUrlLever(
  url: string
): DadosUrlLever | null {
  try {
    const urlAnalisada = new URL(url)
    const hostname = urlAnalisada.hostname.toLowerCase()

    const ehGlobal =
      hostname === "jobs.lever.co"

    const ehEuropa =
      hostname === "jobs.eu.lever.co"

    if (!ehGlobal && !ehEuropa) {
      return null
    }

    const partes = urlAnalisada.pathname
      .split("/")
      .filter(Boolean)

    const site = partes[0]
    const idVaga = partes[1]

    if (!site || !idVaga) {
      return null
    }

    const dominioApi = ehEuropa
      ? "https://api.eu.lever.co"
      : "https://api.lever.co"

    return {
      site,
      idVaga,
      urlApi:
        `${dominioApi}/v0/postings/` +
        `${encodeURIComponent(site)}/` +
        `${encodeURIComponent(idVaga)}`
    }
  } catch {
    return null
  }
}

/**
 * Reúno as listas adicionais da Lever, como requisitos, benefícios
 * e responsabilidades, mantendo os títulos informados pela empresa.
 */
function montarListas(
  listas: RespostaLever["lists"]
) {
  if (!listas?.length) {
    return null
  }

  const secoes = listas
    .map((lista) => {
      const titulo =
        normalizarTexto(lista.text)

      const conteudo =
        converterHtmlParaTexto(
          lista.content
        )

      if (!conteudo) {
        return null
      }

      return titulo
        ? `${titulo}\n${conteudo}`
        : conteudo
    })
    .filter(
      (secao): secao is string =>
        Boolean(secao)
    )

  return secoes.length > 0
    ? secoes.join("\n\n")
    : null
}

/**
 * Monto uma descrição única para entregar ao matcher posteriormente.
 */
function montarDescricao(
  vaga: RespostaLever
): string | null {
  const descricao =
    normalizarTexto(
      vaga.descriptionPlain
    ) ??
    normalizarTexto(
      vaga.openingPlain
    )

  const listas =
    montarListas(vaga.lists)

  const adicional =
    normalizarTexto(
      vaga.additionalPlain
    )

  const partes = [
    descricao,
    listas,
    adicional
  ].filter(
    (parte): parte is string =>
      Boolean(parte)
  )

  return partes.length > 0
    ? partes.join("\n\n")
    : null
}

/**
 * Aproveito primeiro o workplaceType informado oficialmente pela Lever.
 * Uso o texto somente como alternativa quando esse campo não existe.
 */
function detectarRemoto(
  vaga: RespostaLever
) {
  if (vaga.workplaceType === "remote") {
    return true
  }

  if (
    vaga.workplaceType === "on-site" ||
    vaga.workplaceType === "hybrid"
  ) {
    return false
  }

  const texto = [
    vaga.text,
    vaga.categories?.location,
    vaga.descriptionPlain
  ]
    .filter(
      (valor): valor is string =>
        Boolean(valor)
    )
    .join(" ")

  return /\b(remote|remoto|remota|home office)\b/i.test(
    texto
  )
}

/**
 * Busco uma vaga individual pela API pública da Lever.
 *
 * Se a URL não for reconhecida ou a publicação não estiver mais
 * disponível, retorno null para permitir que o inspetor tente outro método.
 */
export async function extrairVagaLever(
  url: string
): Promise<VagaExtraida | null> {
  const dadosUrl =
    interpretarUrlLever(url)

  if (!dadosUrl) {
    return null
  }

  try {
    const resposta = await fetch(
      dadosUrl.urlApi,
      {
        headers: {
          Accept: "application/json"
        }
      }
    )

    if (!resposta.ok) {
      return null
    }

    const dados =
      (await resposta.json()) as RespostaLever

    const titulo =
      normalizarTexto(dados.text)

    if (!titulo) {
      return null
    }

    const localizacao =
      normalizarTexto(
        dados.categories?.location
      ) ??
      (
        dados.categories?.allLocations?.length
          ? dados.categories.allLocations.join(", ")
          : null
      ) ??
      normalizarTexto(
        dados.country ?? undefined
      )

    return {
      titulo,

      // A API pública da Lever não garante um nome de empresa separado.
      // Prefiro não inventar essa informação usando apenas o slug da URL.
      empresa: null,

      descricao:
        montarDescricao(dados),

      localizacao,

      tipoContratacao:
        normalizarTexto(
          dados.categories?.commitment
        ),

      dataPublicacao: null,
      validaAte: null,

      remoto:
        detectarRemoto(dados),

      urlCandidatura:
        normalizarTexto(
          dados.applyUrl
        ) ??
        normalizarTexto(
          dados.hostedUrl
        ) ??
        url
    }
  } catch {
    return null
  }
}