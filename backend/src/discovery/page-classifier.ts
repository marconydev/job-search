import type {
  PaginaClassificada,
  PaginaDescoberta,
  ProvedorPagina
} from "../types/discovery.js"

/**
 * Mantenho aqui os domínios que funcionam como agregadores de vagas.
 *
 * Não descarto esses resultados, porque ainda podem ajudar na descoberta.
 * Apenas separo de páginas oficiais e ATS conhecidos.
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
 * Verifico se o domínio informado pertence a um site que já identifiquei
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
 * Identifico a origem provável da página usando apenas o domínio.
 *
 * Nesta etapa eu ainda não confirmo se existe uma vaga válida.
 * Uso essa classificação apenas para decidir como a página será
 * analisada depois.
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
      return "aggregator"
    }

    // Se eu ainda não reconheço o domínio, deixo a decisão para a
    // inspeção da página. O caminho da URL sozinho não é suficiente
    // para afirmar que estou no site oficial de uma empresa.
    return "unknown"
  } catch {
    // Mantenho URLs inválidas como desconhecidas para não interromper
    // toda a descoberta por causa de um único resultado malformado.
    return "unknown"
  }
}

/**
 * Acrescento a classificação sem alterar os dados originais encontrados
 * na busca, porque ainda vou precisar deles nas próximas etapas.
 */
export function classificarPagina(
  pagina: PaginaDescoberta
): PaginaClassificada {
  return {
    ...pagina,
    provider: identificarProvedorPagina(pagina.url)
  }
}

/**
 * Mantenho estes aliases temporariamente porque outros arquivos ainda
 * usam os nomes antigos. Removo quando terminar a migração.
 */
export const identifyPageProvider = identificarProvedorPagina
export const classifyPage = classificarPagina