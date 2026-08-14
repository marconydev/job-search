import type { PaginaClassificada, PaginaDescoberta, ProvedorPagina } from "../types/discovery.js"

/**
 * Mantenho aqui portais, ATS complementares e agregadores que podem ser
 * úteis para descobrir uma oportunidade, mas que ainda não possuem um
 * extrator estruturado próprio no projeto.
 */
const dominiosAgregadores = new Set([
  "4dayweek.io",
  "bebee.com",
  "catho.com.br",
  "dailyremote.com",
  "dice.com",
  "dynamitejobs.com",
  "empregos.com.br",
  "geekhunter.com.br",
  "helpfulremote.com",
  "himalayas.app",
  "infojobs.com.br",
  "jobleads.com",
  "jobtoday.com",
  "nijobs.com",
  "programathor.com.br",
  "remoteanywherejob.com",
  "remoteclickjobs-production.up.railway.app",
  "remoterocketship.com",
  "remotezest.up.railway.app",
  "remotar.com.br",
  "simplyhired.com.br",
  "simplify.jobs",
  "talent.com",
  "tealhq.com",
  "topcsjobs.com",
  "trabajo.org",
  "trampos.co",
  "tryremotely.com",
  "vacancyglobalpro.up.railway.app",
  "vagas.com.br",
  "weworkremotely.com",

  /**
   * ATS complementares que quero manter na descoberta mesmo antes
   * de implementar extração estruturada específica para cada um.
   */
  "vagas.solides.com.br",
  "pandape.infojobs.com.br",
  "pandape.catho.com.br",
  "myworkdayjobs.com",
  "myworkdaysite.com"
])

function ehDominioAgregador(hostname: string) {
  return [...dominiosAgregadores].some(
    dominio => hostname === dominio || hostname.endsWith(`.${dominio}`)
  )
}

/**
 * Identifico a origem provável usando somente domínios conhecidos.
 *
 * Uma URL desconhecida continua desconhecida até conseguirmos confirmar
 * o conteúdo. Não considero "/jobs" ou "/careers" prova suficiente de
 * que o endereço pertence à página oficial de uma empresa.
 */
export function identificarProvedorPagina(url: string): ProvedorPagina {
  try {
    const urlAnalisada = new URL(url)

    const hostname = urlAnalisada.hostname.toLowerCase().replace(/^www\./, "")

    if (hostname === "gupy.io" || hostname.endsWith(".gupy.io")) {
      return "gupy"
    }

    if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) {
      return "linkedin"
    }

    if (hostname === "jobs.lever.co" || hostname === "jobs.eu.lever.co") {
      return "lever"
    }

    if (
      hostname === "boards.greenhouse.io" ||
      hostname === "job-boards.greenhouse.io" ||
      hostname.endsWith(".greenhouse.io")
    ) {
      return "greenhouse"
    }

    if (hostname === "apply.workable.com" || hostname === "jobs.workable.com") {
      return "workable"
    }

    if (hostname === "jobs.smartrecruiters.com") {
      return "smartrecruiters"
    }

    if (hostname === "indeed.com" || hostname.endsWith(".indeed.com")) {
      return "indeed"
    }

    if (hostname === "remoteok.com") {
      return "remote-ok"
    }

    if (hostname === "remotive.com" || hostname.endsWith(".remotive.com")) {
      return "remotive"
    }

    if (ehDominioAgregador(hostname)) {
      return "agregador"
    }

    return "desconhecido"
  } catch {
    return "desconhecido"
  }
}

/**
 * Acrescento a origem identificada mantendo todos os dados encontrados
 * pelo mecanismo de busca.
 */
export function classificarPagina(pagina: PaginaDescoberta): PaginaClassificada {
  return {
    ...pagina,

    provedor: identificarProvedorPagina(pagina.url)
  }
}
