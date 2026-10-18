import * as cheerio from "cheerio"

import { fetchComTimeout, limparEspacos, limparHtml } from "../collectors/collector-utils.js"

import type { VagaExtraida } from "../types/page-inspection.js"

type ObjetoJsonLd = { [chave: string]: unknown }

function ehObjeto(valor: unknown): valor is ObjetoJsonLd {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
}

function lerTexto(valor: unknown): string | null {
  if (typeof valor !== "string") return null
  const t = valor.trim()
  return t || null
}

function ehJobPosting(valor: ObjetoJsonLd) {
  const tipo = valor["@type"]
  if (typeof tipo === "string") return tipo.toLowerCase() === "jobposting"
  if (Array.isArray(tipo)) {
    return tipo.some(item => typeof item === "string" && item.toLowerCase() === "jobposting")
  }
  return false
}

function encontrarJobPosting(valor: unknown): ObjetoJsonLd | null {
  if (Array.isArray(valor)) {
    for (const item of valor) {
      const r = encontrarJobPosting(item)
      if (r) return r
    }
    return null
  }
  if (!ehObjeto(valor)) return null
  if (ehJobPosting(valor)) return valor
  for (const filho of Object.values(valor)) {
    const r = encontrarJobPosting(filho)
    if (r) return r
  }
  return null
}

function jsonLdDoHtml(html: string): ObjetoJsonLd | null {
  const padrao = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = padrao.exec(html)) !== null) {
    const conteudo = m[1]?.trim()
    if (!conteudo) continue
    try {
      const dados = JSON.parse(conteudo)
      const posting = encontrarJobPosting(dados)
      if (posting) return posting
    } catch {
      continue
    }
  }
  return null
}

function enderecoDoPosting(posting: ObjetoJsonLd): string | null {
  const local = posting.jobLocation

  const extrair = (v: unknown): string | null => {
    if (Array.isArray(v)) {
      const partes = v.map(extrair).filter((x): x is string => Boolean(x))
      return partes.length > 0 ? partes.join(" | ") : null
    }
    if (!ehObjeto(v)) return lerTexto(v)
    const end = v.address
    if (!ehObjeto(end)) return lerTexto(v.name)
    const cidade = lerTexto(end.addressLocality)
    const uf = lerTexto(end.addressRegion)
    let pais: string | null = null
    if (typeof end.addressCountry === "string") pais = lerTexto(end.addressCountry)
    else if (ehObjeto(end.addressCountry)) pais = lerTexto(end.addressCountry.name)
    const partes = [cidade, uf, pais].filter((x): x is string => Boolean(x))
    return partes.length > 0 ? [...new Set(partes)].join(", ") : null
  }

  const fisico = extrair(local)
  if (fisico) return fisico
  return extrair(posting.applicantLocationRequirements)
}

function empresaDoPosting(posting: ObjetoJsonLd): string | null {
  const org = posting.hiringOrganization
  if (!ehObjeto(org)) return null
  return lerTexto(org.name)
}

function remotoDoPosting(posting: ObjetoJsonLd, localizacao: string | null) {
  const tipo = lerTexto(posting.jobLocationType)
  if (tipo && tipo.toLowerCase().includes("telecommute")) return true
  const texto = [lerTexto(posting.title), localizacao, lerTexto(posting.description)]
    .filter((x): x is string => Boolean(x))
    .join(" ")
    .toLowerCase()
  return /\b(remote|remoto|remota|home office)\b/i.test(texto)
}

/**
 * Parse puro do HTML — sem rede — para testes unitários.
 *
 * Estratégia:
 *  1. JSON-LD JobPosting (quando LinkedIn entrega — raro mas acontece em
 *     alguns subdomínios e páginas de empresa).
 *  2. Fallback HTML público sem autenticação. Seletores:
 *       h1.topcard__title, .topcard__org-name-link,
 *       .topcard__flavor--bullet, .description__text,
 *       .show-more-less-html__markup.
 *
 * Se faltar título, empresa ou descrição, retorno null — a vaga é
 * descartada silenciosamente em vez de virar registro incompleto.
 */
export function parseLinkedinHtml(html: string, url: string): VagaExtraida | null {
  const posting = jsonLdDoHtml(html)

  if (posting) {
    const localizacao = enderecoDoPosting(posting)
    return {
      titulo: lerTexto(posting.title),
      empresa: empresaDoPosting(posting),
      descricao: limparHtml(lerTexto(posting.description) ?? ""),
      localizacao,
      tipoContratacao: lerTexto(posting.employmentType),
      dataPublicacao: lerTexto(posting.datePosted),
      validaAte: lerTexto(posting.validThrough),
      remoto: remotoDoPosting(posting, localizacao),
      urlCandidatura: lerTexto(posting.url) ?? url
    }
  }

  const $ = cheerio.load(html)

  const titulo =
    limparEspacos($("h1.topcard__title").first().text()) ||
    limparEspacos($("h1").first().text()) ||
    limparEspacos($('a[href*="/jobs/view/"]').first().text()) ||
    limparEspacos($("title").text().split("|")[0]) ||
    null

  const empresa =
    limparEspacos($(".topcard__org-name-link").first().text()) ||
    limparEspacos($('a[href*="/company/"]').first().text()) ||
    limparEspacos($("a[class*='org-name']").first().text()) ||
    null

  const descricaoHtml =
    $('[data-testid="expandable-text-box"]').first().html() ||
    $(".description__text").first().html() ||
    $(".show-more-less-html__markup").first().html() ||
    null

  const descricao = descricaoHtml ? limparHtml(descricaoHtml) : null

  const bullets = $(".topcard__flavor--bullet")
    .map((_i, el) => limparEspacos($(el).text()))
    .get()
    .filter(Boolean)

  let localizacao =
    bullets.find(b => /,\s*(?:[A-Z]{2}\b|Brasil|Brazil|Portugal|USA?|United)/i.test(b)) ||
    bullets[bullets.length - 1] ||
    null

  if (!localizacao) {
    const locMatch = $("body").text().match(/([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(?:,\s*Brasil)?)/)
    if (locMatch) localizacao = limparEspacos(locMatch[1])
  }

  // Fallback para a data de publicação a partir do texto relativo ("há 2 semanas")
  let dataPublicacao: string | null = null
  const matchData = $("body").text().match(/há\s+(\d+)\s+(dia|dias|semana|semanas|mês|meses|ano|anos)/i)
  if (matchData) {
    const num = parseInt(matchData[1], 10)
    const unidade = matchData[2].toLowerCase()
    const d = new Date()
    if (unidade.startsWith("dia")) d.setDate(d.getDate() - num)
    else if (unidade.startsWith("semana")) d.setDate(d.getDate() - (num * 7))
    else if (unidade.startsWith("mês") || unidade.startsWith("mes")) d.setMonth(d.getMonth() - num)
    else if (unidade.startsWith("ano")) d.setFullYear(d.getFullYear() - num)
    dataPublicacao = d.toISOString()
  }
  if (!titulo || !empresa || !descricao) {
    return null
  }

  const remoto = /\b(remote|remoto|remota|home office)\b/i.test(
    `${titulo ?? ""} ${localizacao ?? ""} ${descricao}`
  )

  return {
    titulo,
    empresa,
    descricao,
    localizacao,
    tipoContratacao: null,
    dataPublicacao,
    validaAte: null,
    remoto,
    urlCandidatura: url
  }
}

export async function extrairVagaLinkedin(url: string): Promise<VagaExtraida | null> {
  try {
    const resposta = await fetchComTimeout(url, {
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
      }
    })

    if (!resposta.ok) return null

    const tipo = resposta.headers.get("content-type") ?? ""
    if (!tipo.toLowerCase().includes("text/html")) return null

    const html = await resposta.text()
    return parseLinkedinHtml(html, resposta.url || url)
  } catch {
    return null
  }
}
