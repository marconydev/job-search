import * as cheerio from "cheerio"

import type {
  VagaExtraida
} from "../types/page-inspection.js"

/**
 * Mantenho os campos no formato original porque esta estrutura representa
 * diretamente a resposta externa da API da Greenhouse.
 */
type RespostaGreenhouse = {
  id?: number
  title?: string
  company_name?: string
  first_published?: string
  updated_at?: string
  application_deadline?: string

  location?: {
    name?: string
  }

  content?: string
  absolute_url?: string
}

type DadosUrlGreenhouse = {
  tokenQuadro: string
  idVaga: string
}

/**
 * Normalizo valores simples antes de converter a resposta externa
 * para o modelo utilizado internamente.
 */
function normalizarTexto(
  valor: string | undefined
): string | null {
  const texto = valor?.trim()

  return texto || null
}

/**
 * A descrição da Greenhouse pode conter HTML e entidades codificadas.
 * Uso o Cheerio para transformar esse conteúdo em texto legível.
 */
function converterDescricao(
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
 * Retiro o token do quadro e o identificador da vaga diretamente da URL.
 */
function interpretarUrlGreenhouse(
  url: string
): DadosUrlGreenhouse | null {
  try {
    const urlAnalisada = new URL(url)

    const hostname =
      urlAnalisada.hostname.toLowerCase()

    const dominioValido =
      hostname === "boards.greenhouse.io" ||
      hostname === "job-boards.greenhouse.io"

    if (!dominioValido) {
      return null
    }

    const partes = urlAnalisada.pathname
      .split("/")
      .filter(Boolean)

    const tokenQuadro = partes[0]

    const indiceJobs =
      partes.findIndex(
        (parte) =>
          parte.toLowerCase() === "jobs"
      )

    const idVaga =
      indiceJobs >= 0
        ? partes[indiceJobs + 1]
        : null

    if (
      !tokenQuadro ||
      !idVaga
    ) {
      return null
    }

    return {
      tokenQuadro,
      idVaga
    }
  } catch {
    return null
  }
}

/**
 * Considero remoto quando a localização ou o conteúdo indicam
 * explicitamente esse formato de trabalho.
 */
function detectarRemoto(
  titulo: string,
  localizacao: string | null,
  descricao: string | null
) {
  const texto = [
    titulo,
    localizacao,
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
 * Consulto diretamente o Job Board público da Greenhouse.
 *
 * Não preciso de credencial para esta leitura porque a própria
 * plataforma disponibiliza os dados publicados por GET.
 */
export async function extrairVagaGreenhouse(
  url: string
): Promise<VagaExtraida | null> {
  const dadosUrl =
    interpretarUrlGreenhouse(url)

  if (!dadosUrl) {
    return null
  }

  const urlApi =
    "https://boards-api.greenhouse.io/v1/boards/" +
    `${encodeURIComponent(dadosUrl.tokenQuadro)}/jobs/` +
    `${encodeURIComponent(dadosUrl.idVaga)}`

  try {
    const resposta = await fetch(
      urlApi,
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
      (await resposta.json()) as RespostaGreenhouse

    const titulo =
      normalizarTexto(dados.title)

    if (!titulo) {
      return null
    }

    const localizacao =
      normalizarTexto(
        dados.location?.name
      )

    const descricao =
      converterDescricao(
        dados.content
      )

    return {
      titulo,

      empresa:
        normalizarTexto(
          dados.company_name
        ),

      descricao,

      localizacao,

      // O endpoint público de uma vaga não garante um campo padrão
      // equivalente ao tipo de contrato da nossa estrutura interna.
      tipoContratacao: null,

      dataPublicacao:
        normalizarTexto(
          dados.first_published
        ),

      validaAte:
        normalizarTexto(
          dados.application_deadline
        ),

      remoto:
        detectarRemoto(
          titulo,
          localizacao,
          descricao
        ),

      urlCandidatura:
        normalizarTexto(
          dados.absolute_url
        ) ??
        url
    }
  } catch {
    return null
  }
}