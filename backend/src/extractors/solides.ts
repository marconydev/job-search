import * as cheerio from "cheerio"

import type { VagaExtraida } from "../types/page-inspection.js"

type RaizCheerio = ReturnType<typeof cheerio.load>

function normalizarLinha(valor: string) {
  return valor
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function extrairLinhas($: RaizCheerio) {
  const corpo = $("body").clone()

  corpo.find("script, style, noscript, svg").remove()

  corpo.find("br").replaceWith("\n")

  corpo.find("h1, h2, h3, h4, p, li, button, div").each((_indice, elemento) => {
    $(elemento).append("\n")
  })

  return corpo
    .text()
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map(normalizarLinha)
    .filter(Boolean)
}

function ehLocalizacao(valor: string) {
  const linha = normalizarLinha(valor)

  if (/^Brasil$/i.test(linha)) {
    return true
  }

  return /^.{2,100}\s+-\s+[A-Z]{2}$/.test(linha)
}

function ehMetadadoVaga(valor: string) {
  const linha = normalizarTexto(valor)

  if (!linha) {
    return true
  }

  if (/^\d+\s+posi[cç][aã]o(?:es)?$/.test(linha)) {
    return true
  }

  const metadadosExatos = [
    "elegivel para pcd",
    "elegivel pcd",
    "nao informado",
    "integral",
    "clt",
    "pj",
    "presencial",
    "hibrido",
    "remoto",
    "remota",
    "junior",
    "pleno",
    "senior",
    "especialista",
    "principal",
    "estagiario",
    "estagiaria"
  ]

  if (metadadosExatos.includes(linha)) {
    return true
  }

  if (/^r\$\s*/i.test(valor)) {
    return true
  }

  return false
}

function ehLinhaNavegacao(valor: string) {
  const linha = normalizarTexto(valor)

  return [
    "home",
    "vagas",
    "entrar",
    "cadastre se",
    "quero me candidatar",
    "candidatura pelo whatsapp",
    "banco de talentos"
  ].includes(linha)
}

function extrairTitulo($: RaizCheerio) {
  const titulo = normalizarLinha($("h1").first().text())

  return titulo || null
}

function extrairEmpresa(linhas: string[], titulo: string) {
  const tituloNormalizado = normalizarTexto(titulo)

  const indiceTitulo = linhas.findIndex(
    linha => normalizarTexto(linha) === tituloNormalizado
  )

  const inicio = indiceTitulo >= 0 ? indiceTitulo + 1 : 0

  for (
    let indice = inicio;
    indice < Math.min(linhas.length, inicio + 12);
    indice++
  ) {
    const linha = linhas[indice]

    if (!linha) {
      continue
    }

    if (normalizarTexto(linha) === tituloNormalizado) {
      continue
    }

    if (ehLinhaNavegacao(linha)) {
      continue
    }

    if (ehLocalizacao(linha)) {
      continue
    }

    if (ehMetadadoVaga(linha)) {
      continue
    }

    return linha
  }

  return null
}

function extrairLocalizacao(linhas: string[], titulo: string) {
  const tituloNormalizado = normalizarTexto(titulo)

  const indiceTitulo = linhas.findIndex(
    linha => normalizarTexto(linha) === tituloNormalizado
  )

  const inicio = indiceTitulo >= 0 ? indiceTitulo + 1 : 0

  for (
    let indice = inicio;
    indice < Math.min(linhas.length, inicio + 40);
    indice++
  ) {
    const linha = linhas[indice]

    if (ehLocalizacao(linha)) {
      return linha
    }
  }

  return null
}

function linhaDeveSerIgnoradaNaDescricao(
  linha: string,
  titulo: string,
  empresa: string | null
) {
  const normalizada = normalizarTexto(linha)

  if (!normalizada) {
    return true
  }

  if (normalizada === normalizarTexto(titulo)) {
    return true
  }

  if (empresa && normalizada === normalizarTexto(empresa)) {
    return true
  }

  if (ehLinhaNavegacao(linha)) {
    return true
  }

  if (ehMetadadoVaga(linha)) {
    return true
  }

  return false
}

function extrairDescricao(
  linhas: string[],
  titulo: string,
  empresa: string | null,
  localizacao: string | null
) {
  let inicio = 0

  if (localizacao) {
    const indiceLocalizacao = linhas.findIndex(
      linha => normalizarTexto(linha) === normalizarTexto(localizacao)
    )

    if (indiceLocalizacao >= 0) {
      inicio = indiceLocalizacao + 1
    }
  }

  if (inicio === 0) {
    const indiceTitulo = linhas.findIndex(
      linha => normalizarTexto(linha) === normalizarTexto(titulo)
    )

    inicio = indiceTitulo >= 0 ? indiceTitulo + 1 : 0
  }

  const conteudo: string[] = []

  for (let indice = inicio; indice < linhas.length; indice++) {
    const linha = linhas[indice]

    const linhaNormalizada = normalizarTexto(linha)

    if (
      linhaNormalizada === "como chegar" ||
      linhaNormalizada.startsWith("solides tudo que o rh precisa") ||
      linhaNormalizada === "central de ajuda" ||
      linhaNormalizada === "suporte ao candidato"
    ) {
      break
    }

    if (linhaDeveSerIgnoradaNaDescricao(linha, titulo, empresa)) {
      continue
    }

    if (localizacao && normalizarTexto(linha) === normalizarTexto(localizacao)) {
      continue
    }

    conteudo.push(linha)
  }

  const descricao = conteudo.join("\n").trim()

  return descricao || null
}

function detectarRemoto(
  linhas: string[],
  titulo: string,
  descricao: string | null
) {
  if (
    linhas.some(linha => {
      const normalizada = normalizarTexto(linha)

      return normalizada === "remoto" || normalizada === "remota"
    })
  ) {
    return true
  }

  const contexto = [titulo, descricao]
    .filter((valor): valor is string => Boolean(valor))
    .join(" ")

  return /\b(100%\s*remot[oa]|trabalho\s+remot[oa]|modelo\s+remot[oa]|home\s*office|fully\s+remote)\b/i.test(
    contexto
  )
}

/**
 * Extrator específico das páginas individuais da Sólides.
 *
 * A estrutura visual pode mudar, portanto evito depender de classes CSS
 * geradas pelo frontend e trabalho principalmente com a semântica do
 * conteúdo público apresentado ao candidato.
 */
export function extrairVagaSolides(
  html: string,
  urlFinal: string
): VagaExtraida | null {
  const $ = cheerio.load(html)

  const titulo = extrairTitulo($)

  if (!titulo) {
    return null
  }

  const linhas = extrairLinhas($)

  const empresa = extrairEmpresa(linhas, titulo)

  const localizacao = extrairLocalizacao(linhas, titulo)

  const descricao = extrairDescricao(
    linhas,
    titulo,
    empresa,
    localizacao
  )

  if (!descricao) {
    return null
  }

  return {
    titulo,

    empresa,

    descricao,

    localizacao,

    tipoContratacao: null,

    dataPublicacao: null,

    validaAte: null,

    remoto: detectarRemoto(linhas, titulo, descricao),

    urlCandidatura: urlFinal
  }
}