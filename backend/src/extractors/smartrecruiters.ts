import * as cheerio from "cheerio"

import type {
  VagaExtraida
} from "../types/page-inspection.js"

type DadosUrlSmartRecruiters = {
  empresa: string
  idPublicacao: string
}

type SecaoSmartRecruiters = {
  title?: string
  text?: string
}

type RespostaSmartRecruiters = {
  id?: string
  uuid?: string
  name?: string
  releasedDate?: string
  active?: boolean
  applyUrl?: string

  company?: {
    name?: string
    identifier?: string
  }

  location?: {
    city?: string
    region?: string
    country?: string
    remote?: boolean
  }

  typeOfEmployment?: {
    id?: string
    label?: string
  }

  jobAd?: {
    sections?: Record<
      string,
      SecaoSmartRecruiters
    >
  }
}

/**
 * Leio textos simples retornados pela API e removo espaços excedentes.
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
 * Extraio da URL pública o identificador da empresa e o ID da publicação.
 *
 * A URL normalmente possui o identificador numérico seguido pelo
 * título amigável da vaga.
 */
function interpretarUrlSmartRecruiters(
  url: string
): DadosUrlSmartRecruiters | null {
  try {
    const urlAnalisada = new URL(url)

    const hostname = urlAnalisada.hostname
      .toLowerCase()
      .replace(/^www\./, "")

    if (
      hostname !==
      "jobs.smartrecruiters.com"
    ) {
      return null
    }

    const partes = urlAnalisada.pathname
      .split("/")
      .filter(Boolean)

    const empresa = partes[0]
    const identificadorComTitulo = partes[1]

    if (
      !empresa ||
      !identificadorComTitulo
    ) {
      return null
    }

    const correspondencia =
      identificadorComTitulo.match(
        /^(\d+|[0-9a-f-]{20,})/i
      )

    const idPublicacao =
      correspondencia?.[1]

    if (!idPublicacao) {
      return null
    }

    return {
      empresa,
      idPublicacao
    }
  } catch {
    return null
  }
}

/**
 * Converto o conteúdo HTML das seções em texto simples para manter
 * somente as informações úteis da vaga.
 */
function limparTextoHtml(
  valor: string | undefined
): string | null {
  if (!valor) {
    return null
  }

  const $ = cheerio.load(valor)

  $("br").replaceWith("\n")

  $("p, li").each(
    (_indice, elemento) => {
      $(elemento).append("\n")
    }
  )

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
 * Reúno todas as seções publicadas pela empresa mantendo os títulos.
 *
 * Assim consigo aproveitar também seções personalizadas sem depender
 * somente de nomes fixos como descrição ou qualificações.
 */
function montarDescricao(
  resposta: RespostaSmartRecruiters
): string | null {
  const secoes =
    resposta.jobAd?.sections

  if (!secoes) {
    return null
  }

  const partes = Object.values(secoes)
    .map((secao) => {
      const titulo =
        lerTexto(secao.title)

      const texto =
        limparTextoHtml(secao.text)

      if (!texto) {
        return null
      }

      return titulo
        ? `${titulo}\n${texto}`
        : texto
    })
    .filter(
      (parte): parte is string =>
        Boolean(parte)
    )

  return partes.length > 0
    ? partes.join("\n\n")
    : null
}

/**
 * Transformo códigos de país em nomes mais legíveis quando possível.
 *
 * Isso ajuda também a minha regra de elegibilidade a identificar
 * corretamente países como BR, US ou NZ.
 */
function normalizarPais(
  pais: string | undefined
): string | null {
  const valor = lerTexto(pais)

  if (!valor) {
    return null
  }

  if (valor.length !== 2) {
    return valor
  }

  try {
    const nomesRegioes =
      new Intl.DisplayNames(
        ["en"],
        {
          type: "region"
        }
      )

    return (
      nomesRegioes.of(
        valor.toUpperCase()
      ) ??
      valor
    )
  } catch {
    return valor
  }
}

/**
 * Transformo cidade, região e país em uma única localização.
 */
function extrairLocalizacao(
  resposta: RespostaSmartRecruiters
): string | null {
  const local = resposta.location

  if (!local) {
    return null
  }

  const partes = [
    lerTexto(local.city),
    lerTexto(local.region),
    normalizarPais(local.country)
  ].filter(
    (parte): parte is string =>
      Boolean(parte)
  )

  return partes.length > 0
    ? [...new Set(partes)].join(", ")
    : null
}

/**
 * Considero remoto primeiro pelo campo estruturado da plataforma.
 *
 * Uso também o conteúdo como alternativa caso a empresa informe
 * trabalho remoto apenas no título ou na descrição.
 */
function detectarRemoto(
  resposta: RespostaSmartRecruiters,
  descricao: string | null
) {
  if (
    resposta.location?.remote === true
  ) {
    return true
  }

  const texto = [
    resposta.name,
    extrairLocalizacao(resposta),
    descricao
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
 * Consulto diretamente a publicação pública disponibilizada pela
 * SmartRecruiters e converto a resposta para o modelo do Job Search.
 */
export async function extrairVagaSmartRecruiters(
  url: string
): Promise<VagaExtraida | null> {
  const dadosUrl =
    interpretarUrlSmartRecruiters(url)

  if (!dadosUrl) {
    return null
  }

  const urlApi =
    "https://api.smartrecruiters.com/v1/companies/" +
    `${encodeURIComponent(dadosUrl.empresa)}/postings/` +
    `${encodeURIComponent(dadosUrl.idPublicacao)}`

  try {
    const resposta = await fetch(
      urlApi,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en"
        }
      }
    )

    if (!resposta.ok) {
      return null
    }

    const dados = (
      await resposta.json()
    ) as RespostaSmartRecruiters

    if (
      dados.active === false
    ) {
      return null
    }

    const titulo =
      lerTexto(dados.name)

    if (!titulo) {
      return null
    }

    const descricao =
      montarDescricao(dados)

    return {
      titulo,

      empresa:
        lerTexto(
          dados.company?.name
        ),

      descricao,

      localizacao:
        extrairLocalizacao(dados),

      tipoContratacao:
        lerTexto(
          dados.typeOfEmployment?.label
        ),

      dataPublicacao:
        lerTexto(
          dados.releasedDate
        ),

      validaAte: null,

      remoto:
        detectarRemoto(
          dados,
          descricao
        ),

      urlCandidatura:
        lerTexto(
          dados.applyUrl
        ) ??
        url
    }
  } catch {
    return null
  }
}