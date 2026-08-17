import type { PaginaClassificada, ProvedorPagina } from "../../types/discovery.js"

import type { PerfilProfissional } from "../../types/perfil-profissional.js"

import type { PaginaSomenteDescoberta } from "../../types/processamento-web.js"

const provedoresProcessaveis = new Set<ProvedorPagina>([
  "gupy",
  "lever",
  "greenhouse",
  "workable",
  "smartrecruiters"
])

const termosComplementaresTitulo = [
  "help desk",
  "service desk",
  "desktop support",
  "field service",
  "support",
  "suporte",
  "noc",
  "monitoring",
  "monitoramento",
  "observability",
  "observabilidade",
  "implementation",
  "implantacao",
  "infraestrutura",
  "sustentacao",
  "sustentação",
  "application support",
  "application analyst",
  "production support",
  "customer onboarding",
  "technical operations",
  "it operations"
]

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function contemExpressao(texto: string, termo: string) {
  const textoNormalizado = ` ${normalizarTexto(texto)} `
  const termoNormalizado = normalizarTexto(termo)

  if (!termoNormalizado) {
    return false
  }

  return textoNormalizado.includes(` ${termoNormalizado} `)
}

/**
 * Faço aqui apenas uma triagem inicial para evitar processar páginas
 * claramente fora do perfil. A decisão final continua sendo do matcher.
 */
export function paginaPareceRelacionada(pagina: PaginaClassificada, perfil: PerfilProfissional) {
  const contexto = [pagina.titulo, pagina.descricao]
    .filter((valor): valor is string => Boolean(valor))
    .join(" ")

  const cargos = [
    ...perfil.cargosPrincipais,
    ...perfil.cargosRelacionados,
    ...termosComplementaresTitulo
  ]

  if (cargos.some(cargo => contemExpressao(contexto, cargo))) {
    return true
  }

  const indicadoresCargo = [
    "analista",
    "analyst",
    "support",
    "suporte",
    "technician",
    "tecnico",
    "técnico",
    "specialist",
    "especialista",
    "operations",
    "operacoes",
    "operações"
  ]

  const possuiIndicador = indicadoresCargo.some(indicador => contemExpressao(contexto, indicador))

  if (!possuiIndicador) {
    return false
  }

  const competencias = perfil.competencias.filter(competencia =>
    competencia.termos.some(termo => contemExpressao(contexto, termo))
  )

  return competencias.length >= 2
}

export function paginaEhListagem(pagina: PaginaClassificada) {
  try {
    const url = new URL(pagina.url)
    const caminho = url.pathname.toLowerCase()

    if (pagina.provedor === "indeed") {
      return !caminho.includes("/viewjob") || !url.searchParams.has("jk")
    }

    if (pagina.provedor === "linkedin") {
      return !caminho.includes("/jobs/view/")
    }

    if (pagina.provedor === "greenhouse") {
      return !/\/jobs\/\d+/i.test(caminho)
    }

    if (pagina.provedor === "workable") {
      return !/\/j\/[a-z0-9]+/i.test(caminho)
    }

    if (pagina.provedor === "smartrecruiters") {
      const partes = caminho.split("/").filter(Boolean)

      return partes.length < 2 || !/^\d+/.test(partes[1] ?? "")
    }

    if (pagina.provedor === "lever") {
      const partes = caminho.split("/").filter(Boolean)

      return partes.length < 2
    }

    if (pagina.provedor === "gupy") {
      return !(caminho.includes("/jobs/") || caminho.includes("/job/"))
    }

    if (pagina.provedor === "remote-ok") {
      return (
        caminho === "/" ||
        caminho.includes("customer-support-jobs") ||
        caminho.includes("technical-jobs") ||
        caminho.includes("jobs-in-brazil") ||
        caminho.includes("product-manager-jobs")
      )
    }

    return false
  } catch {
    return true
  }
}

export function normalizarPaginaParaInspecao(pagina: PaginaClassificada): PaginaClassificada {
  if (pagina.provedor !== "workable") {
    return pagina
  }

  try {
    const url = new URL(pagina.url)

    url.pathname = url.pathname.replace(/\/apply\/?$/i, "/")

    return {
      ...pagina,
      url: url.toString()
    }
  } catch {
    return pagina
  }
}

export function ehProvedorProcessavel(pagina: PaginaClassificada) {
  return provedoresProcessaveis.has(pagina.provedor)
}

export function paginaEstaIndisponivel(url: string, codigoStatus: number) {
  if (codigoStatus >= 400) {
    return true
  }

  try {
    const urlAnalisada = new URL(url)

    return (
      urlAnalisada.searchParams.get("not_found") === "true" ||
      urlAnalisada.searchParams.get("error") === "true"
    )
  } catch {
    return false
  }
}

/**
 * Descarto conteúdos informativos que podem conter as mesmas palavras
 * técnicas de uma vaga, mas não representam uma oportunidade real.
 */
export function paginaPareceConteudoInformativo(titulo: string, url: string) {
  const texto = normalizarTexto(titulo)

  const padroesFortes = [
    "salary",
    "salaries",
    "salario",
    "quanto ganha",
    "o que faz",
    "what is",
    "job description",
    "guia completo",
    "complete guide",
    "reviews",
    "review",
    "certificacoes",
    "certifications",
    "diferencas",
    "differences",
    "tutorial",
    "como funciona"
  ]

  if (padroesFortes.some(padrao => texto.includes(normalizarTexto(padrao)))) {
    return true
  }

  const falaDeSoftware = contemExpressao(texto, "software")

  const pareceRanking = ["best", "melhores", "top", "tools", "ferramentas"].some(termo =>
    contemExpressao(texto, termo)
  )

  if (falaDeSoftware && pareceRanking) {
    return true
  }

  try {
    const urlAnalisada = new URL(url)

    const hostname = urlAnalisada.hostname.toLowerCase()
    const caminho = urlAnalisada.pathname.toLowerCase()

    const dominiosConteudo = ["learn.g2.com", "zendesk.com", "capterra.com"]

    const pareceArtigo =
      caminho.includes("/blog/") || caminho.includes("/artigos/") || caminho.includes("/reviews/")

    if (dominiosConteudo.some(dominio => hostname.endsWith(dominio)) && pareceArtigo) {
      return true
    }
  } catch {
    return false
  }

  return false
}

/**
 * Para LinkedIn considero apenas sinais presentes na própria página.
 * A consulta usada na busca não serve como evidência geográfica.
 */
function linkedinTemSinalBrasil(pagina: PaginaSomenteDescoberta) {
  try {
    const url = new URL(pagina.url)
    const hostname = url.hostname.toLowerCase()

    if (hostname === "br.linkedin.com" || hostname.endsWith(".br.linkedin.com")) {
      return true
    }
  } catch {
    // Se a URL não puder ser interpretada, continuo pela análise do texto.
  }

  const contexto = normalizarTexto(
    [pagina.titulo, pagina.descricao].filter((valor): valor is string => Boolean(valor)).join(" ")
  )

  const contextoComEspacos = ` ${contexto} `

  const sinaisBrasil = [
    " brazil ",
    " brasil ",
    " sao paulo ",
    " rio de janeiro ",
    " belo horizonte ",
    " curitiba ",
    " florianopolis ",
    " porto alegre ",
    " recife ",
    " fortaleza ",
    " salvador ",
    " joao pessoa ",
    " campina grande ",
    " brasilia ",
    " goiania ",
    " campinas ",
    " barueri ",
    " uberlandia ",
    " sp ",
    " rj ",
    " mg ",
    " pr ",
    " sc ",
    " rs ",
    " pe ",
    " pb ",
    " ce ",
    " ba ",
    " df ",
    " go "
  ]

  return sinaisBrasil.some(sinal => contextoComEspacos.includes(sinal))
}

function indeedEhBrasileiro(pagina: PaginaSomenteDescoberta) {
  try {
    const hostname = new URL(pagina.url).hostname.toLowerCase()

    return hostname === "br.indeed.com" || hostname.endsWith(".br.indeed.com")
  } catch {
    return false
  }
}

export function paginaTemSinalBrasil(pagina: PaginaSomenteDescoberta) {
  if (pagina.provedor === "linkedin") {
    return linkedinTemSinalBrasil(pagina)
  }

  if (pagina.provedor === "indeed") {
    return indeedEhBrasileiro(pagina)
  }

  let hostname = ""

  try {
    hostname = new URL(pagina.url).hostname.toLowerCase()
  } catch {
    hostname = ""
  }

  if (hostname.endsWith(".br")) {
    return true
  }

  const contexto = normalizarTexto(
    [pagina.titulo, pagina.descricao].filter((valor): valor is string => Boolean(valor)).join(" ")
  )

  const sinais = [
    "brasil",
    "brazil",
    "sao paulo",
    "rio de janeiro",
    "belo horizonte",
    "curitiba",
    "florianopolis",
    "porto alegre",
    "recife",
    "fortaleza",
    "salvador",
    "joao pessoa",
    "campina grande",
    "brasilia",
    "goiania",
    "campinas",
    "barueri",
    "uberlandia"
  ]

  return sinais.some(sinal => contexto.includes(sinal))
}

/**
 * Não considero a palavra "remoto" isolada em qualquer contexto.
 * Ela pode estar descrevendo apenas a forma de prestar suporte.
 */
export function detectarTrabalhoRemoto(pagina: PaginaSomenteDescoberta) {
  const titulo = pagina.titulo
  const descricao = pagina.descricao ?? ""

  const expressoesTitulo = [
    /\bremote\b/i,
    /\bremot[oa]\b/i,
    /\bhome\s*office\b/i,
    /\bwork\s+from\s+home\b/i,
    /\b100%\s*remot[oa]\b/i
  ]

  if (expressoesTitulo.some(padrao => padrao.test(titulo))) {
    return true
  }

  const expressoesDescricao = [
    /\bvaga\s+(?:100%\s*)?remot[oa]\b/i,
    /\btrabalho\s+(?:100%\s*)?remot[oa]\b/i,
    /\bmodelo\s+(?:de\s+trabalho\s+)?remot[oa]\b/i,
    /\bmodalidade\s+remot[oa]\b/i,
    /\bregime\s+remot[oa]\b/i,
    /\bhome\s*office\b/i,
    /\bwork\s+from\s+home\b/i,
    /\bfully\s+remote\b/i
  ]

  return expressoesDescricao.some(padrao => padrao.test(descricao))
}
