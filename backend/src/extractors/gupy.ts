import * as cheerio from "cheerio"

import type {
  VagaExtraida
} from "../types/page-inspection.js"

type RaizCheerio = ReturnType<typeof cheerio.load>

const rotulosSecoes = {
  descricao: [
    "job description",
    "descrição da vaga",
    "descricao da vaga"
  ],

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

  etapasProcesso: [
    "process stages",
    "etapas do processo"
  ]
}

/**
 * Normalizo pequenos trechos de texto sem retirar informações que
 * ainda podem ser úteis para analisar a vaga posteriormente.
 */
function normalizarTextoCurto(valor: string) {
  return valor
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Transformo o conteúdo visível da página em linhas porque a Gupy
 * organiza a vaga em seções com títulos relativamente previsíveis.
 *
 * Prefiro usar o conteúdo da página em vez de depender de classes CSS
 * internas da plataforma, que podem mudar sem aviso.
 */
function extrairLinhasPagina($: RaizCheerio) {
  const corpo = $("body").clone()

  corpo
    .find("script, style, noscript, svg")
    .remove()

  corpo
    .find("br")
    .replaceWith("\n")

  corpo
    .find("h1, h2, h3, p, li")
    .each((_indice, elemento) => {
      corpo.find(elemento).append("\n")
    })

  return corpo
    .text()
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map(normalizarTextoCurto)
    .filter(Boolean)
}

/**
 * Comparo os títulos sem diferenciar letras maiúsculas e minúsculas.
 */
function correspondeRotulo(
  valor: string,
  rotulos: string[]
) {
  const valorNormalizado = valor.toLowerCase()

  return rotulos.some(
    (rotulo) =>
      valorNormalizado === rotulo.toLowerCase()
  )
}

/**
 * Reúno todos os títulos conhecidos para identificar quando uma
 * seção termina e a próxima começa.
 */
function obterTodosRotulos() {
  return Object.values(rotulosSecoes).flat()
}

/**
 * Extraio uma seção usando seu título como ponto inicial.
 *
 * Paro quando encontro outro título conhecido para não misturar
 * requisitos, responsabilidades e outras partes da vaga.
 */
function extrairSecao(
  linhas: string[],
  rotulos: string[]
): string | null {
  const indiceInicial = linhas.findIndex(
    (linha) => correspondeRotulo(linha, rotulos)
  )

  if (indiceInicial === -1) {
    return null
  }

  const todosRotulos = obterTodosRotulos()
  const conteudo: string[] = []

  for (
    let indice = indiceInicial + 1;
    indice < linhas.length;
    indice++
  ) {
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
 * Tento encontrar primeiro o nome informado pelos metadados da página.
 *
 * Quando a Gupy não informa a empresa claramente, uso o subdomínio
 * como último recurso para não perder completamente essa informação.
 */
function extrairEmpresa(
  $: RaizCheerio,
  urlFinal: string
): string | null {
  const seletoresMetadados = [
    'meta[property="og:site_name"]',
    'meta[name="application-name"]'
  ]

  for (const seletor of seletoresMetadados) {
    const conteudo = normalizarTextoCurto(
      $(seletor).first().attr("content") ?? ""
    )

    if (
      conteudo &&
      conteudo.toLowerCase() !== "gupy"
    ) {
      return conteudo
    }
  }

  try {
    const hostname = new URL(urlFinal)
      .hostname
      .toLowerCase()

    if (!hostname.endsWith(".gupy.io")) {
      return null
    }

    const identificadorEmpresa =
      hostname.split(".")[0]

    if (!identificadorEmpresa) {
      return null
    }

    return identificadorEmpresa
      .split("-")
      .filter(Boolean)
      .map((parte) =>
        parte.charAt(0).toUpperCase() +
        parte.slice(1)
      )
      .join(" ")
  } catch {
    return null
  }
}

/**
 * Procuro valores estruturados que possam existir diretamente no HTML.
 *
 * Quando a página não disponibiliza a informação, retorno null em vez
 * de tentar deduzir um valor que não consigo confirmar.
 */
function extrairValorEstruturado(
  $: RaizCheerio,
  propriedade: string
): string | null {
  const elemento = $(
    `[itemprop="${propriedade}"]`
  ).first()

  if (!elemento.length) {
    return null
  }

  const valor =
    elemento.attr("content") ??
    elemento.attr("datetime") ??
    elemento.text()

  const valorNormalizado =
    normalizarTextoCurto(valor)

  return valorNormalizado || null
}

/**
 * Considero a vaga remota somente quando encontro uma indicação
 * explícita no conteúdo que consegui extrair.
 */
function detectarRemoto(texto: string) {
  return /\b(remote|remoto|remota|100%\s*remot[oa]|home\s*office)\b/i.test(
    texto
  )
}

/**
 * Verifico se o texto do link representa uma ação de candidatura.
 */
function ehLinkCandidatura(texto: string) {
  const textoNormalizado =
    normalizarTextoCurto(texto).toLowerCase()

  return (
    textoNormalizado === "apply" ||
    textoNormalizado === "apply now" ||
    textoNormalizado === "candidatar-se" ||
    textoNormalizado === "candidatar" ||
    textoNormalizado === "candidate-se" ||
    textoNormalizado === "inscreva-se"
  )
}

/**
 * Tento localizar o botão de candidatura da própria vaga.
 *
 * Se o botão apenas aponta para uma seção interna da página, mantenho
 * a URL atual porque o processo começa no mesmo endereço.
 */
function extrairUrlCandidatura(
  $: RaizCheerio,
  urlFinal: string
): string {
  const elementoCandidatura = $("a")
    .toArray()
    .find((elemento) =>
      ehLinkCandidatura($(elemento).text())
    )

  if (!elementoCandidatura) {
    return urlFinal
  }

  const href =
    $(elementoCandidatura).attr("href")

  if (
    !href ||
    href.startsWith("#")
  ) {
    return urlFinal
  }

  try {
    return new URL(
      href,
      urlFinal
    ).toString()
  } catch {
    return urlFinal
  }
}

/**
 * Junto somente as partes que realmente ajudam a entender a oportunidade
 * e comparar seus requisitos com o meu perfil profissional.
 */
function montarDescricao(
  descricao: string | null,
  responsabilidades: string | null,
  requisitos: string | null,
  informacoesAdicionais: string | null
) {
  const secoes = [
    descricao
      ? `Descrição da vaga\n${descricao}`
      : null,

    responsabilidades
      ? `Responsabilidades\n${responsabilidades}`
      : null,

    requisitos
      ? `Requisitos\n${requisitos}`
      : null,

    informacoesAdicionais
      ? `Informações adicionais\n${informacoesAdicionais}`
      : null
  ].filter(
    (secao): secao is string =>
      Boolean(secao)
  )

  return secoes.length > 0
    ? secoes.join("\n\n")
    : null
}

/**
 * Extraio os dados disponíveis diretamente do HTML de uma vaga da Gupy.
 *
 * Uso este caminho quando a plataforma não disponibiliza um JSON-LD
 * do tipo JobPosting na página acessada.
 */
export function extrairVagaGupy(
  html: string,
  urlFinal: string
): VagaExtraida | null {
  const $ = cheerio.load(html)

  const titulo = normalizarTextoCurto(
    $("h1").first().text()
  )

  // Sem um título principal eu não considero a página uma vaga válida.
  if (!titulo) {
    return null
  }

  const linhas = extrairLinhasPagina($)

  const descricao = extrairSecao(
    linhas,
    rotulosSecoes.descricao
  )

  const responsabilidades = extrairSecao(
    linhas,
    rotulosSecoes.responsabilidades
  )

  const requisitos = extrairSecao(
    linhas,
    rotulosSecoes.requisitos
  )

  const informacoesAdicionais = extrairSecao(
    linhas,
    rotulosSecoes.informacoesAdicionais
  )

  const descricaoCompleta = montarDescricao(
    descricao,
    responsabilidades,
    requisitos,
    informacoesAdicionais
  )

  // Exijo pelo menos uma seção típica de vaga além do título para
  // reduzir falsos positivos dentro da própria plataforma.
  if (
    !descricao &&
    !responsabilidades &&
    !requisitos
  ) {
    return null
  }

  const textoParaAnalise = [
    titulo,
    descricaoCompleta
  ]
    .filter(
      (valor): valor is string =>
        Boolean(valor)
    )
    .join(" ")

  return {
    titulo,
    empresa: extrairEmpresa($, urlFinal),
    descricao: descricaoCompleta,
    localizacao: null,
    tipoContratacao: null,
    dataPublicacao: extrairValorEstruturado(
      $,
      "datePosted"
    ),
    validaAte: extrairValorEstruturado(
      $,
      "validThrough"
    ),
    remoto: detectarRemoto(
      textoParaAnalise
    ),
    urlCandidatura: extrairUrlCandidatura(
      $,
      urlFinal
    )
  }
}