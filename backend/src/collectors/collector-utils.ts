import * as cheerio from "cheerio"

import { gerarTermosBuscaNativaGupy } from "../config/search-queries.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

const TEMPO_LIMITE_REQUISICAO_MS = 15_000

const MILISSEGUNDOS = {
  minuto: 60 * 1000,

  hora: 60 * 60 * 1000,

  dia: 24 * 60 * 60 * 1000,

  semana: 7 * 24 * 60 * 60 * 1000,

  mes: 30 * 24 * 60 * 60 * 1000
} as const

/**
 * Compartilho um cliente HTTP mínimo entre os coletores públicos.
 *
 * Não adiciono outra dependência porque o Node já fornece fetch e cada
 * coletor continua responsável por interpretar a resposta da própria fonte.
 */
export async function fetchComTimeout(
  url: string | URL,
  init: RequestInit = {},
  tempoLimiteMs = TEMPO_LIMITE_REQUISICAO_MS
) {
  const controlador = new AbortController()

  const temporizador = setTimeout(() => controlador.abort(), tempoLimiteMs)

  const headers = new Headers(init.headers)

  if (!headers.has("User-Agent")) {
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
  }

  if (!headers.has("Accept-Language")) {
    headers.set("Accept-Language", "pt-BR,pt;q=0.9")
  }

  try {
    return await fetch(url, {
      ...init,

      headers,

      signal: controlador.signal
    })
  } finally {
    clearTimeout(temporizador)
  }
}

/**
 * Transformo HTML de descrição em texto legível antes de enviar a vaga ao matcher.
 */
export function limparHtml(valor: string | null | undefined) {
  const html = valor?.trim()

  if (!html) {
    return ""
  }

  const $ = cheerio.load(html)

  $("br").replaceWith("\n")

  $("p, li, h1, h2, h3, h4, section").each((_indice, elemento) => {
    $(elemento).append("\n")
  })

  return $("body")
    .text()
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function limparEspacos(valor: string | null | undefined) {
  return (valor ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

export function criarSlugBusca(valor: string) {
  return normalizarTexto(valor)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function resolverUrl(base: string, href: string | null | undefined) {
  const valor = href?.trim()

  if (!valor) {
    return null
  }

  try {
    return new URL(valor, base).toString()
  } catch {
    return null
  }
}

/**
 * Reaproveito a mesma matriz de cargos em português já usada pela Gupy e pela Sólides.
 *
 * O perfil pode manter aliases em inglês para o matcher, mas não deixo esses aliases
 * virarem termos de consulta nos portais. Assim evito que um novo coletor reintroduza
 * buscas como "technical support" ou "support analyst" por acidente.
 */
export function gerarTermosBuscaPortugues(perfil: PerfilProfissional, limite = 12) {
  const limiteNormalizado = Math.min(Math.max(Math.floor(limite), 1), 30)

  return gerarTermosBuscaNativaGupy(perfil).slice(0, limiteNormalizado)
}

/**
 * Interpreto as formas de data relativas mais comuns nos portais brasileiros sem
 * confundir a data em que encontrei a vaga com a data publicada pela própria fonte.
 */
export function interpretarDataPtBr(valor: string, agora = new Date()) {
  const texto = normalizarTexto(valor)

  if (!texto) {
    return null
  }

  const dataAbsoluta = texto.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)

  if (dataAbsoluta) {
    const dia = Number(dataAbsoluta[1])

    const mes = Number(dataAbsoluta[2])

    const ano = Number(dataAbsoluta[3])

    const data = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0))

    if (
      data.getUTCFullYear() === ano &&
      data.getUTCMonth() === mes - 1 &&
      data.getUTCDate() === dia
    ) {
      return data.toISOString()
    }
  }

  if (/\bagora\b/.test(texto) || /\bhoje\b/.test(texto)) {
    return agora.toISOString()
  }

  if (/\bontem\b/.test(texto)) {
    return new Date(agora.getTime() - MILISSEGUNDOS.dia).toISOString()
  }

  const relativa = texto.match(
    /\bha\s+(\d+)\s+(minuto|minutos|hora|horas|dia|dias|semana|semanas|mes|meses)\b/
  )

  if (!relativa) {
    return null
  }

  const quantidade = Number(relativa[1])

  const unidadeBruta = relativa[2]

  let unidade: keyof typeof MILISSEGUNDOS

  if (unidadeBruta.startsWith("minuto")) {
    unidade = "minuto"
  } else if (unidadeBruta.startsWith("hora")) {
    unidade = "hora"
  } else if (unidadeBruta.startsWith("dia")) {
    unidade = "dia"
  } else if (unidadeBruta.startsWith("semana")) {
    unidade = "semana"
  } else {
    unidade = "mes"
  }

  return new Date(agora.getTime() - quantidade * MILISSEGUNDOS[unidade]).toISOString()
}
