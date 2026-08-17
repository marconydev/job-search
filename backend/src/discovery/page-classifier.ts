import type { PaginaClassificada, PaginaDescoberta, ProvedorPagina } from "../types/discovery.js"

const dominiosAgregadores = new Set([
  "4dayweek.io",
  "bebee.com",
  "dailyremote.com",
  "dice.com",
  "dynamitejobs.com",
  "empregos.com.br",
  "geekhunter.com.br",
  "helpfulremote.com",
  "himalayas.app",
  "jobleads.com",
  "jobtoday.com",
  "nijobs.com",
  "programathor.com.br",
  "remoteanywherejob.com",
  "remoterocketship.com",
  "remotar.com.br",
  "simplyhired.com.br",
  "simplify.jobs",
  "talent.com",
  "tealhq.com",
  "topcsjobs.com",
  "trabajo.org",
  "trampos.co",
  "tryremotely.com",
  "weworkremotely.com"
])

function ehDominio(hostname: string, dominio: string) {
  return hostname === dominio || hostname.endsWith(`.${dominio}`)
}

function ehDominioAgregador(hostname: string) {
  return [...dominiosAgregadores].some(dominio => ehDominio(hostname, dominio))
}

export function identificarProvedorPagina(url: string): ProvedorPagina {
  try {
    const urlAnalisada = new URL(url)

    const hostname = urlAnalisada.hostname.toLowerCase().replace(/^www\./, "")

    if (ehDominio(hostname, "gupy.io")) {
      return "gupy"
    }

    if (ehDominio(hostname, "linkedin.com")) {
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

    if (hostname === "jobs.ashbyhq.com") {
      return "ashby"
    }

    if (ehDominio(hostname, "recruitee.com")) {
      return "recruitee"
    }

    if (ehDominio(hostname, "myworkdayjobs.com") || ehDominio(hostname, "myworkdaysite.com")) {
      return "workday"
    }

    if (hostname === "vagas.solides.com.br") {
      return "solides"
    }

    if (hostname === "pandape.infojobs.com.br" || hostname === "pandape.catho.com.br") {
      return "pandape"
    }

    if (ehDominio(hostname, "vagas.com.br")) {
      return "vagas"
    }

    if (ehDominio(hostname, "infojobs.com.br")) {
      return "infojobs"
    }

    if (ehDominio(hostname, "catho.com.br")) {
      return "catho"
    }

    if (ehDominio(hostname, "indeed.com")) {
      return "indeed"
    }

    if (hostname === "remoteok.com") {
      return "remote-ok"
    }

    if (ehDominio(hostname, "remotive.com")) {
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

export function classificarPagina(pagina: PaginaDescoberta): PaginaClassificada {
  return {
    ...pagina,

    provedor: identificarProvedorPagina(pagina.url)
  }
}
