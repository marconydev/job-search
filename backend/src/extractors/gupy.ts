import * as cheerio from "cheerio"

import type { VagaExtraida } from "../types/page-inspection.js"

type RaizCheerio = ReturnType<typeof cheerio.load>

type ContextoGupy = {
  idVaga: string
  urlCarreiras: string
}

const rotulosSecoes = {
  descricao: ["job description", "descrição da vaga", "descricao da vaga"],

  responsabilidades: [
    "responsibilities and assignments",
    "responsabilidades e atribuições",
    "responsabilidades e atribuicoes"
  ],

  requisitos: [
    "requirements and qualifications",
    "requisitos e qualificações",
    "requisitos e qualificacoes"
  ],

  informacoesAdicionais: [
    "additional information",
    "informações adicionais",
    "informacoes adicionais"
  ],

  etapasProcesso: ["process stages", "etapas do processo"]
}

function normalizarTextoCurto(valor: string) {
  return valor
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extrairLinhasPagina($: RaizCheerio) {
  const corpo = $("body").clone()

  corpo.find("script, style, noscript, svg").remove()

  corpo.find("br").replaceWith("\n")

  corpo.find("h1, h2, h3, p, li").each((_indice, elemento) => {
    $(elemento).append("\n")
  })

  return corpo
    .text()
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map(normalizarTextoCurto)
    .filter(Boolean)
}

function correspondeRotulo(valor: string, rotulos: string[]) {
  const valorNormalizado = valor.toLowerCase()

  return rotulos.some(rotulo => valorNormalizado === rotulo.toLowerCase())
}

function obterTodosRotulos() {
  return Object.values(rotulosSecoes).flat()
}

function extrairSecao(linhas: string[], rotulos: string[]): string | null {
  const indiceInicial = linhas.findIndex(linha => correspondeRotulo(linha, rotulos))

  if (indiceInicial === -1) {
    return null
  }

  const todosRotulos = obterTodosRotulos()

  const conteudo: string[] = []

  for (let indice = indiceInicial + 1; indice < linhas.length; indice++) {
    const linha = linhas[indice]

    if (correspondeRotulo(linha, todosRotulos)) {
      break
    }

    conteudo.push(linha)
  }

  const texto = conteudo.join("\n").trim()

  return texto || null
}

/**
 * Tento recuperar a empresa sem aceitar como nome da organização
 * o próprio título da vaga.
 */
function extrairEmpresa($: RaizCheerio, urlFinal: string, tituloVaga: string): string | null {
  const tituloNormalizado = normalizarTextoCurto(tituloVaga).toLowerCase()

  const seletoresMetadados = ['meta[property="og:site_name"]', 'meta[name="application-name"]']

  for (const seletor of seletoresMetadados) {
    const conteudo = normalizarTextoCurto($(seletor).first().attr("content") ?? "")

    const conteudoNormalizado = conteudo.toLowerCase()

    if (conteudo && conteudoNormalizado !== "gupy" && conteudoNormalizado !== tituloNormalizado) {
      return conteudo
    }
  }

  try {
    const hostname = new URL(urlFinal).hostname.toLowerCase()

    if (!hostname.endsWith(".gupy.io")) {
      return null
    }

    const identificadorEmpresa = hostname.split(".")[0]

    if (!identificadorEmpresa) {
      return null
    }

    return identificadorEmpresa
      .split("-")
      .filter(Boolean)
      .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
      .join(" ")
  } catch {
    return null
  }
}

function extrairValorEstruturado($: RaizCheerio, propriedade: string): string | null {
  const elemento = $(`[itemprop="${propriedade}"]`).first()

  if (!elemento.length) {
    return null
  }

  const valor = elemento.attr("content") ?? elemento.attr("datetime") ?? elemento.text()

  const valorNormalizado = normalizarTextoCurto(valor)

  return valorNormalizado || null
}

function detectarRemoto(texto: string) {
  return /\b(remote|remoto|remota|100%\s*remot[oa]|home\s*office)\b/i.test(texto)
}

function ehLinkCandidatura(texto: string) {
  const textoNormalizado = normalizarTextoCurto(texto).toLowerCase()

  return (
    textoNormalizado === "apply" ||
    textoNormalizado === "apply now" ||
    textoNormalizado === "candidatar-se" ||
    textoNormalizado === "candidatar" ||
    textoNormalizado === "candidate-se" ||
    textoNormalizado === "inscreva-se"
  )
}

function extrairUrlCandidatura($: RaizCheerio, urlFinal: string): string {
  const elementoCandidatura = $("a")
    .toArray()
    .find(elemento => ehLinkCandidatura($(elemento).text()))

  if (!elementoCandidatura) {
    return urlFinal
  }

  const href = $(elementoCandidatura).attr("href")

  if (!href || href.startsWith("#")) {
    return urlFinal
  }

  try {
    return new URL(href, urlFinal).toString()
  } catch {
    return urlFinal
  }
}

function montarDescricao(
  descricao: string | null,
  responsabilidades: string | null,
  requisitos: string | null,
  informacoesAdicionais: string | null
) {
  const secoes = [
    descricao ? `Descrição da vaga\n${descricao}` : null,

    responsabilidades ? `Responsabilidades\n${responsabilidades}` : null,

    requisitos ? `Requisitos\n${requisitos}` : null,

    informacoesAdicionais ? `Informações adicionais\n${informacoesAdicionais}` : null
  ].filter((secao): secao is string => Boolean(secao))

  return secoes.length > 0 ? secoes.join("\n\n") : null
}

/**
 * Recupero o identificador da vaga e a página oficial de carreiras
 * usando somente a própria URL da Gupy.
 */
function interpretarContextoGupy(urlFinal: string): ContextoGupy | null {
  try {
    const url = new URL(urlFinal)

    const hostname = url.hostname.toLowerCase()

    if (!hostname.endsWith(".gupy.io")) {
      return null
    }

    const partes = url.pathname.split("/").filter(Boolean)

    const indiceVaga = partes.findIndex(parte => {
      const valor = parte.toLowerCase()

      return valor === "job" || valor === "jobs"
    })

    const idVaga = partes[indiceVaga + 1]

    if (!idVaga) {
      return null
    }

    return {
      idVaga,
      urlCarreiras: `${url.protocol}//${hostname}/`
    }
  } catch {
    return null
  }
}

/**
 * Quando a página individual não informa localização, consulto a
 * página oficial de carreiras da mesma empresa.
 *
 * Só uso informações pertencentes à própria Gupy da empresa.
 */
async function enriquecerPelaPaginaCarreiras(
  vaga: VagaExtraida,
  urlFinal: string
): Promise<VagaExtraida> {
  const contexto = interpretarContextoGupy(urlFinal)

  if (!contexto) {
    return vaga
  }

  const controlador = new AbortController()

  const temporizador = setTimeout(() => controlador.abort(), 12000)

  try {
    const resposta = await fetch(contexto.urlCarreiras, {
      signal: controlador.signal,

      headers: {
        Accept: "text/html,application/xhtml+xml",

        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
      }
    })

    if (!resposta.ok) {
      return vaga
    }

    const html = await resposta.text()

    const $ = cheerio.load(html)

    const linkVaga = $("a")
      .toArray()
      .find(elemento => {
        const href = $(elemento).attr("href")

        if (!href) {
          return false
        }

        return href.includes(`/jobs/${contexto.idVaga}`)
      })

    if (!linkVaga) {
      return vaga
    }

    const textoCartao = normalizarTextoCurto($(linkVaga).text())

    const textoPagina = normalizarTextoCurto($("body").text())

    const remoto =
      vaga.remoto || /\b(remote work|trabalho remoto|remoto|home office)\b/i.test(textoCartao)

    let localizacao = vaga.localizacao

    /**
     * Só assumo Brasil quando a própria página oficial da empresa
     * declara que as oportunidades são oferecidas em todo o país.
     */
    if (
      !localizacao &&
      /\b(em todo o brasil|todo o brasil|throughout brazil)\b/i.test(textoPagina)
    ) {
      localizacao = "Brasil"
    }

    return {
      ...vaga,
      localizacao,
      remoto
    }
  } catch {
    return vaga
  } finally {
    clearTimeout(temporizador)
  }
}

/**
 * Extraio os dados públicos da vaga individual e depois tento
 * complementar localização e modalidade pela página oficial da empresa.
 */
export async function extrairVagaGupy(
  html: string,
  urlFinal: string
): Promise<VagaExtraida | null> {
  const $ = cheerio.load(html)

  const titulo = normalizarTextoCurto($("h1").first().text())

  if (!titulo) {
    return null
  }

  const linhas = extrairLinhasPagina($)

  const descricao = extrairSecao(linhas, rotulosSecoes.descricao)

  const responsabilidades = extrairSecao(linhas, rotulosSecoes.responsabilidades)

  const requisitos = extrairSecao(linhas, rotulosSecoes.requisitos)

  const informacoesAdicionais = extrairSecao(linhas, rotulosSecoes.informacoesAdicionais)

  const descricaoCompleta = montarDescricao(
    descricao,
    responsabilidades,
    requisitos,
    informacoesAdicionais
  )

  if (!descricao && !responsabilidades && !requisitos) {
    return null
  }

  const textoParaAnalise = [titulo, descricaoCompleta]
    .filter((valor): valor is string => Boolean(valor))
    .join(" ")

  const vaga: VagaExtraida = {
    titulo,

    empresa: extrairEmpresa($, urlFinal, titulo),

    descricao: descricaoCompleta,

    localizacao: null,

    tipoContratacao: null,

    dataPublicacao: extrairValorEstruturado($, "datePosted"),

    validaAte: extrairValorEstruturado($, "validThrough"),

    remoto: detectarRemoto(textoParaAnalise),

    urlCandidatura: extrairUrlCandidatura($, urlFinal)
  }

  return enriquecerPelaPaginaCarreiras(vaga, urlFinal)
}
