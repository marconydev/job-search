import * as cheerio from "cheerio"

import type { VagaExtraida } from "../types/page-inspection.js"

type ObjetoGenerico = Record<string, unknown>

type DadosUrlWorkable = {
  conta: string
  codigoVaga: string
}

const URL_API_PUBLICA = "https://www.workable.com/api/accounts"

/**
 * Confirmo se um valor pode ser tratado como objeto antes de acessar
 * qualquer campo recebido da API.
 */
function ehObjeto(valor: unknown): valor is ObjetoGenerico {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
}

/**
 * Leio somente valores textuais válidos e removo espaços desnecessários.
 */
function lerTexto(valor: unknown): string | null {
  if (typeof valor !== "string") {
    return null
  }

  const texto = valor.trim()

  return texto || null
}

/**
 * Algumas respostas públicas podem chegar como JSON puro ou envolvidas
 * por uma chamada JSONP. Aceito os dois formatos para não depender
 * da forma como a Workable entregar a resposta.
 */
function interpretarResposta(conteudo: string): unknown {
  try {
    return JSON.parse(conteudo)
  } catch {
    const inicio = conteudo.indexOf("(")
    const fim = conteudo.lastIndexOf(")")

    if (inicio === -1 || fim === -1 || fim <= inicio) {
      return null
    }

    try {
      return JSON.parse(conteudo.slice(inicio + 1, fim))
    } catch {
      return null
    }
  }
}

/**
 * Extraio a conta da empresa e o código público da vaga diretamente
 * do endereço usado pela Workable.
 */
function interpretarUrlWorkable(url: string): DadosUrlWorkable | null {
  try {
    const urlAnalisada = new URL(url)

    const hostname = urlAnalisada.hostname.toLowerCase().replace(/^www\./, "")

    if (hostname !== "apply.workable.com") {
      return null
    }

    const partes = urlAnalisada.pathname.split("/").filter(Boolean)

    const conta = partes[0]

    const indiceCodigo = partes.findIndex(parte => parte.toLowerCase() === "j")

    const codigoVaga = indiceCodigo >= 0 ? partes[indiceCodigo + 1] : null

    if (!conta || !codigoVaga) {
      return null
    }

    return {
      conta,
      codigoVaga
    }
  } catch {
    return null
  }
}

/**
 * Procuro recursivamente a vaga porque o endpoint público pode agrupar
 * as oportunidades dentro de objetos ou listas diferentes.
 *
 * Uso o shortcode como identificação principal porque ele também aparece
 * diretamente na URL pública da oportunidade.
 */
function encontrarVaga(valor: unknown, codigoVaga: string): ObjetoGenerico | null {
  if (Array.isArray(valor)) {
    for (const item of valor) {
      const vaga = encontrarVaga(item, codigoVaga)

      if (vaga) {
        return vaga
      }
    }

    return null
  }

  if (!ehObjeto(valor)) {
    return null
  }

  const shortcode = lerTexto(valor.shortcode)

  if (shortcode?.toLowerCase() === codigoVaga.toLowerCase()) {
    return valor
  }

  const shortlink = lerTexto(valor.shortlink)

  if (shortlink && shortlink.toLowerCase().includes(codigoVaga.toLowerCase())) {
    return valor
  }

  for (const filho of Object.values(valor)) {
    const vaga = encontrarVaga(filho, codigoVaga)

    if (vaga) {
      return vaga
    }
  }

  return null
}

/**
 * Tento recuperar o nome da conta somente quando ele existe diretamente
 * no objeto principal. Não uso valores internos aleatórios para evitar
 * confundir departamento ou localização com o nome da empresa.
 */
function extrairNomeEmpresa(dados: unknown): string | null {
  if (!ehObjeto(dados)) {
    return null
  }

  return lerTexto(dados.name) ?? lerTexto(dados.company_name) ?? lerTexto(dados.companyName)
}

/**
 * Transformo HTML vindo da API em texto legível para o matcher.
 */
function converterHtmlParaTexto(valor: unknown): string | null {
  const html = lerTexto(valor)

  if (!html) {
    return null
  }

  const $ = cheerio.load(html)

  $("br").replaceWith("\n")

  $("p, li, h2, h3, h4").each((_indice, elemento) => {
    $(elemento).append("\n")
  })

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
 * Uso primeiro a descrição completa quando ela estiver disponível.
 *
 * Se a API entregar as partes separadamente, junto descrição, requisitos
 * e benefícios em um único conteúdo para análise.
 */
function extrairDescricao(vaga: ObjetoGenerico): string | null {
  const descricaoCompleta = converterHtmlParaTexto(vaga.full_description)

  if (descricaoCompleta) {
    return descricaoCompleta
  }

  const descricao = converterHtmlParaTexto(vaga.description)

  const requisitos = converterHtmlParaTexto(vaga.requirements)

  const beneficios = converterHtmlParaTexto(vaga.benefits)

  const partes = [
    descricao ? `Descrição\n${descricao}` : null,

    requisitos ? `Requisitos\n${requisitos}` : null,

    beneficios ? `Benefícios\n${beneficios}` : null
  ].filter((parte): parte is string => Boolean(parte))

  return partes.length > 0 ? partes.join("\n\n") : null
}

/**
 * Transformo o objeto de localização da Workable em um texto simples.
 */
function extrairLocalizacao(vaga: ObjetoGenerico): string | null {
  const localizacao = vaga.location

  if (typeof localizacao === "string") {
    return lerTexto(localizacao)
  }

  if (ehObjeto(localizacao)) {
    const localCompleto = lerTexto(localizacao.location_str)

    if (localCompleto) {
      return localCompleto
    }

    const cidade = lerTexto(localizacao.city)

    const regiao = lerTexto(localizacao.region)

    const pais = lerTexto(localizacao.country)

    const partes = [cidade, regiao, pais].filter((parte): parte is string => Boolean(parte))

    if (partes.length > 0) {
      return [...new Set(partes)].join(", ")
    }
  }

  const locais = vaga.locations

  if (Array.isArray(locais)) {
    const textos = locais
      .map(local => {
        if (!ehObjeto(local)) {
          return null
        }

        const partes = [
          lerTexto(local.city),
          lerTexto(local.state_code),
          lerTexto(local.country_name)
        ].filter((parte): parte is string => Boolean(parte))

        return partes.length > 0 ? partes.join(", ") : null
      })
      .filter((local): local is string => Boolean(local))

    if (textos.length > 0) {
      return [...new Set(textos)].join(" | ")
    }
  }

  return null
}

/**
 * Aproveito os campos estruturados da plataforma antes de procurar
 * palavras como remote na descrição.
 */
function detectarRemoto(vaga: ObjetoGenerico, descricao: string | null) {
  const tipoTrabalho = lerTexto(vaga.workplace_type)

  if (tipoTrabalho === "remote") {
    return true
  }

  const localizacao = vaga.location

  if (ehObjeto(localizacao)) {
    if (localizacao.telecommuting === true) {
      return true
    }

    if (lerTexto(localizacao.workplace_type) === "remote") {
      return true
    }
  }

  const texto = [lerTexto(vaga.title), extrairLocalizacao(vaga), descricao]
    .filter((valor): valor is string => Boolean(valor))
    .join(" ")

  return /\b(remote|remoto|remota|home office)\b/i.test(texto)
}

/**
 * Consulto a listagem pública da conta com detalhes habilitados e
 * localizo somente a vaga correspondente ao shortcode recebido.
 */
export async function extrairVagaWorkable(url: string): Promise<VagaExtraida | null> {
  const dadosUrl = interpretarUrlWorkable(url)

  if (!dadosUrl) {
    return null
  }

  const urlApi = `${URL_API_PUBLICA}/` + `${encodeURIComponent(dadosUrl.conta)}` + "?details=true"

  try {
    const resposta = await fetch(urlApi, {
      headers: {
        Accept: "application/json,text/javascript,*/*"
      }
    })

    if (!resposta.ok) {
      return null
    }

    const conteudo = await resposta.text()

    const dados = interpretarResposta(conteudo)

    const vaga = encontrarVaga(dados, dadosUrl.codigoVaga)

    if (!vaga) {
      return null
    }

    const titulo = lerTexto(vaga.title) ?? lerTexto(vaga.full_title)

    if (!titulo) {
      return null
    }

    const descricao = extrairDescricao(vaga)

    return {
      titulo,

      empresa: extrairNomeEmpresa(dados),

      descricao,

      localizacao: extrairLocalizacao(vaga),

      tipoContratacao: lerTexto(vaga.employment_type),

      // O campo created_at representa criação da vaga, não necessariamente
      // a publicação pública. Prefiro não tratá-lo como data de publicação.
      dataPublicacao: null,

      validaAte: null,

      remoto: detectarRemoto(vaga, descricao),

      urlCandidatura:
        lerTexto(vaga.application_url) ?? lerTexto(vaga.shortlink) ?? lerTexto(vaga.url) ?? url
    }
  } catch {
    return null
  }
}
