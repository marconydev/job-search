import type {
  PaginaClassificada,
  PaginaDescoberta,
  ProvedorPagina
} from "../types/discovery.js"

/**
 * Mantenho aqui os domínios que funcionam como agregadores de vagas.
 *
 * Não descarto esses resultados porque ainda podem ajudar na descoberta.
 * Apenas separo agregadores de ATS e páginas que ainda preciso inspecionar.
 */
const dominiosAgregadores = new Set([
  "4dayweek.io",
  "bebee.com",
  "catho.com.br",
  "dailyremote.com",
  "dice.com",
  "dynamitejobs.com",
  "empregos.com.br",
  "helpfulremote.com",
  "himalayas.app",
  "infojobs.com.br",
  "jobleads.com",
  "jobtoday.com",
  "nijobs.com",
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
  "tryremotely.com",
  "vacancyglobalpro.up.railway.app",
  "weworkremotely.com"
])

/**
 * Verifico se o domínio pertence a um site que já identifiquei
 * como agregador ou republicador de oportunidades.
 */
function ehDominioAgregador(hostname: string) {
  return [...dominiosAgregadores].some(
    (dominio) =>
      hostname === dominio ||
      hostname.endsWith(`.${dominio}`)
  )
}

/**
 * Identifico a origem provável da página usando o domínio da URL.
 *
 * Nesta etapa ainda não confirmo se existe uma vaga válida. Uso essa
 * informação apenas para definir como vou analisar a página depois.
 */
export function identificarProvedorPagina(
  url: string
): ProvedorPagina {
  try {
    const urlAnalisada = new URL(url)

    const hostname = urlAnalisada.hostname
      .toLowerCase()
      .replace(/^www\./, "")

    if (
      hostname === "gupy.io" ||
      hostname.endsWith(".gupy.io")
    ) {
      return "gupy"
    }

    if (
      hostname === "linkedin.com" ||
      hostname.endsWith(".linkedin.com")
    ) {
      return "linkedin"
    }

    if (hostname === "jobs.lever.co") {
      return "lever"
    }

    if (
      hostname === "boards.greenhouse.io" ||
      hostname === "job-boards.greenhouse.io" ||
      hostname.endsWith(".greenhouse.io")
    ) {
      return "greenhouse"
    }

    if (
      hostname === "apply.workable.com" ||
      hostname === "jobs.workable.com"
    ) {
      return "workable"
    }

    if (hostname === "jobs.smartrecruiters.com") {
      return "smartrecruiters"
    }

    if (
      hostname === "indeed.com" ||
      hostname.endsWith(".indeed.com")
    ) {
      return "indeed"
    }

    if (hostname === "remoteok.com") {
      return "remote-ok"
    }

    if (
      hostname === "remotive.com" ||
      hostname.endsWith(".remotive.com")
    ) {
      return "remotive"
    }

    if (ehDominioAgregador(hostname)) {
      return "agregador"
    }

    // Se ainda não reconheço o domínio, deixo a decisão para a inspeção.
    // A URL sozinha não é suficiente para afirmar que é uma página oficial.
    return "desconhecido"
  } catch {
    // Mantenho URLs inválidas como desconhecidas para não interromper
    // toda a descoberta por causa de um único resultado malformado.
    return "desconhecido"
  }
}

/**
 * Acrescento a classificação sem alterar os demais dados encontrados
 * durante a busca.
 */
export function classificarPagina(
  pagina: PaginaDescoberta
): PaginaClassificada {
  return {
    ...pagina,
    provedor: identificarProvedorPagina(
      pagina.url
    )
  }
}