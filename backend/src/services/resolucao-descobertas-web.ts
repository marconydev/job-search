import {
  buscarNaWeb
} from "../discovery/brave-search.js"

import {
  classificarPagina
} from "../discovery/page-classifier.js"

import {
  inspecionarPaginaVaga
} from "../discovery/page-inspector.js"

import {
  converterVagaWebParaNovaVaga
} from "./conversao-vaga-web.js"

import {
  createJob as criarVaga,
  isDuplicateJobError as ehErroVagaDuplicada
} from "../repositories/job-repository.js"

import type {
  PaginaClassificada,
  ProvedorPagina
} from "../types/discovery.js"

import type {
  PaginaSomenteDescoberta
} from "../types/processamento-web.js"

import type {
  VagaExtraida
} from "../types/page-inspection.js"

type OpcoesResolucao = {
  limite?: number
  salvarCompativeis?: boolean
}

export type VagaResolvida = {
  origemDescoberta: ProvedorPagina
  tituloDescoberto: string
  urlDescoberta: string

  tituloOficial: string
  empresa: string | null
  urlOficial: string
  provedorOficial: ProvedorPagina

  similaridadeTitulo: number

  localizacao: string | null
  remoto: boolean

  elegibilidadeBrasil:
    "compativel" |
    "incompativel" |
    "indefinida"

  importada: boolean
  duplicada: boolean
}

export type DescobertaNaoResolvida = {
  provedor: ProvedorPagina
  titulo: string
  url: string
  motivo: string
}

export type ResultadoResolucaoDescobertas = {
  candidatasRecebidas: number
  candidatasSelecionadas: number
  resolvidas: number
  compativeisBrasil: number
  incompativeisBrasil: number
  indefinidas: number
  importadas: number
  duplicadas: number

  vagasResolvidas: VagaResolvida[]
  naoResolvidas: DescobertaNaoResolvida[]
}

/**
 * Dou prioridade às fontes que normalmente mostram uma vaga concreta,
 * mas cuja publicação oficial pode estar hospedada em outro lugar.
 */
const prioridadeProvedor:
  Partial<Record<ProvedorPagina, number>> = {
    linkedin: 100,
    indeed: 90,
    desconhecido: 70,
    agregador: 60,
    remotive: 50,
    "remote-ok": 50
  }

/**
 * Não uso estes sites como destino da resolução porque quero chegar
 * preferencialmente à empresa ou ao ATS oficial.
 */
const provedoresNaoOficiais =
  new Set<ProvedorPagina>([
    "linkedin",
    "indeed",
    "agregador",
    "remotive",
    "remote-ok"
  ])

const palavrasIgnoradas =
  new Set([
    "a",
    "o",
    "as",
    "os",
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
    "em",
    "para",
    "com",
    "at",
    "the",
    "of",
    "for",
    "in",
    "and",
    "hiring",
    "vaga",
    "vagas",
    "job",
    "jobs"
  ])

function normalizarTexto(
  valor: string
) {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9+#.]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
}

/**
 * Limpo formatos conhecidos dos títulos apresentados por LinkedIn,
 * Indeed e alguns agregadores.
 *
 * Não preciso deixar o título perfeito. Só preciso retirar ruídos
 * suficientes para conseguir comparar com a vaga oficial depois.
 */
function extrairTituloProvavel(
  pagina: PaginaSomenteDescoberta
) {
  let titulo =
    pagina.titulo.trim()

  if (
    pagina.provedor ===
    "linkedin"
  ) {
    const ingles =
      titulo.match(
        /^(.*?)\s+hiring\s+(.+?)\s+in\s+.+$/i
      )

    if (ingles?.[2]) {
      return ingles[2].trim()
    }

    const portugues =
      titulo.match(
        /cargo de\s+(.+?)\s+em:/i
      )

    if (portugues?.[1]) {
      return portugues[1].trim()
    }
  }

  if (
    pagina.provedor ===
    "indeed"
  ) {
    titulo =
      titulo.replace(
        /\s*-\s*Indeed(?:\.com)?\s*$/i,
        ""
      )

    /**
     * O Indeed costuma acrescentar cidade e estado depois do cargo.
     * Retiro somente o último trecho quando ele tem aparência de UF.
     */
    titulo =
      titulo.replace(
        /\s*-\s*[^-]+,\s*[A-Z]{2}\s*$/i,
        ""
      )
  }

  titulo =
    titulo.replace(
      /^\[Hiring\]\s*/i,
      ""
    )

  const cargoAntesDeEmpresa =
    titulo.match(
      /^(.+?)\s+(?:at|@)\s+.+$/i
    )

  if (
    cargoAntesDeEmpresa?.[1]
  ) {
    return cargoAntesDeEmpresa[1]
      .trim()
  }

  return titulo
}

/**
 * Tento recuperar o nome da empresa somente quando o próprio título
 * possui um formato suficientemente claro.
 */
function extrairEmpresaProvavel(
  pagina: PaginaSomenteDescoberta
): string | null {
  const titulo =
    pagina.titulo.trim()

  if (
    pagina.provedor ===
    "linkedin"
  ) {
    const ingles =
      titulo.match(
        /^(.*?)\s+hiring\s+/i
      )

    if (ingles?.[1]) {
      return ingles[1].trim()
    }

    const portugues =
      titulo.match(
        /^A empresa\s+(.+?)\s+est[aá]\s+contratando/i
      )

    if (
      portugues?.[1]
    ) {
      return portugues[1]
        .trim()
    }
  }

  const formatoAt =
    titulo.match(
      /(?:\sat\s|\s@\s)(.+?)(?:\s+-\s|$)/i
    )

  if (formatoAt?.[1]) {
    return formatoAt[1]
      .trim()
  }

  return null
}

function extrairPalavrasComparacao(
  valor: string
) {
  return new Set(
    normalizarTexto(valor)
      .split(" ")
      .filter(
        (palavra) =>
          palavra.length >= 2 &&
          !palavrasIgnoradas.has(
            palavra
          )
      )
  )
}

/**
 * Comparo o título encontrado com o título oficial.
 *
 * Uso a quantidade de palavras do menor título como referência para
 * permitir pequenas diferenças de escrita entre plataformas.
 */
function calcularSimilaridadeTitulo(
  tituloDescoberto: string,
  tituloOficial: string
) {
  const primeiro =
    normalizarTexto(
      tituloDescoberto
    )

  const segundo =
    normalizarTexto(
      tituloOficial
    )

  if (
    primeiro === segundo
  ) {
    return 1
  }

  if (
    primeiro.includes(
      segundo
    ) ||
    segundo.includes(
      primeiro
    )
  ) {
    return 0.95
  }

  const palavrasPrimeiro =
    extrairPalavrasComparacao(
      primeiro
    )

  const palavrasSegundo =
    extrairPalavrasComparacao(
      segundo
    )

  if (
    palavrasPrimeiro.size === 0 ||
    palavrasSegundo.size === 0
  ) {
    return 0
  }

  let correspondencias = 0

  for (
    const palavra
    of palavrasPrimeiro
  ) {
    if (
      palavrasSegundo.has(
        palavra
      )
    ) {
      correspondencias++
    }
  }

  const menorQuantidade =
    Math.min(
      palavrasPrimeiro.size,
      palavrasSegundo.size
    )

  return (
    correspondencias /
    menorQuantidade
  )
}

/**
 * Crio uma pesquisa pequena e direcionada para encontrar a publicação
 * oficial da mesma oportunidade.
 */
function criarConsultaResolucao(
  pagina: PaginaSomenteDescoberta
) {
  const titulo =
    extrairTituloProvavel(
      pagina
    )

  const empresa =
    extrairEmpresaProvavel(
      pagina
    )

  const partes = [
    `"${titulo}"`,

    empresa
      ? `"${empresa}"`
      : null,

    "(site:gupy.io OR site:jobs.lever.co OR site:boards.greenhouse.io OR site:job-boards.greenhouse.io OR site:apply.workable.com OR site:jobs.smartrecruiters.com OR careers OR vagas)",

    "-site:linkedin.com",
    "-site:indeed.com"
  ].filter(
    (parte): parte is string =>
      Boolean(parte)
  )

  return partes.join(" ")
}

/**
 * Ordeno primeiro LinkedIn e Indeed para aproveitar melhor as chamadas
 * de resolução que farei nesta etapa.
 */
function selecionarCandidatas(
  paginas: PaginaSomenteDescoberta[],
  limite: number
) {
  return [
    ...paginas
  ]
    .sort(
      (a, b) => {
        const prioridadeA =
          prioridadeProvedor[
            a.provedor
          ] ?? 0

        const prioridadeB =
          prioridadeProvedor[
            b.provedor
          ] ?? 0

        return (
          prioridadeB -
          prioridadeA
        )
      }
    )
    .slice(
      0,
      limite
    )
}

/**
 * Não considero novamente resultados vindos de agregadores ou dos
 * próprios portais que deram origem à descoberta.
 */
function paginaPodeSerOficial(
  pagina: PaginaClassificada
) {
  return (
    !provedoresNaoOficiais.has(
      pagina.provedor
    )
  )
}

/**
 * Quando uma página desconhecida fornece um JobPosting válido, considero
 * que ela pode ser uma página própria da empresa.
 */
function definirProvedorOficial(
  provedor: ProvedorPagina
): ProvedorPagina {
  if (
    provedor === "desconhecido"
  ) {
    return "pagina-propria"
  }

  return provedor
}

/**
 * Tento resolver uma página de descoberta para uma publicação oficial.
 *
 * Faço somente uma busca Brave por descoberta e inspeciono os poucos
 * resultados retornados sem novas chamadas ao mecanismo de pesquisa.
 */
async function resolverUmaDescoberta(
  pagina:
    PaginaSomenteDescoberta
) {
  const tituloProvavel =
    extrairTituloProvavel(
      pagina
    )

  const consulta =
    criarConsultaResolucao(
      pagina
    )

  const resultadoBusca =
    await buscarNaWeb(
      consulta,
      8
    )

  const candidatas =
    resultadoBusca.paginas
      .map(
        classificarPagina
      )
      .filter(
        paginaPodeSerOficial
      )

  for (
    const candidata
    of candidatas.slice(
      0,
      5
    )
  ) {
    const inspecao =
      await inspecionarPaginaVaga(
        candidata
      )

    if (
      "erro" in inspecao ||
      !inspecao.vaga ||
      !inspecao.ehPublicacaoVaga
    ) {
      continue
    }

    const tituloOficial =
      inspecao.vaga.titulo

    if (!tituloOficial) {
      continue
    }

    const similaridade =
      calcularSimilaridadeTitulo(
        tituloProvavel,
        tituloOficial
      )

    /**
     * Exijo uma correspondência relativamente alta para evitar associar
     * duas vagas diferentes da mesma empresa.
     */
    if (
      similaridade < 0.65
    ) {
      continue
    }

    return {
      paginaOficial: {
        ...candidata,

        provedor:
          definirProvedorOficial(
            inspecao.provedor
          )
      } satisfies PaginaClassificada,

      vaga:
        inspecao.vaga,

      urlFinal:
        inspecao.urlFinal,

      similaridade,

      elegibilidadeBrasil:
        inspecao.elegibilidadeBrasil
    }
  }

  return null
}

/**
 * Resolvo um conjunto limitado de descobertas.
 *
 * Por padrão não gravo nada no banco. A opção salvarCompativeis permite
 * reutilizar o mesmo serviço futuramente no pipeline automático.
 */
export async function resolverDescobertasWeb(
  paginas:
    PaginaSomenteDescoberta[],

  opcoes:
    OpcoesResolucao = {}
): Promise<
  ResultadoResolucaoDescobertas
> {
  const limite =
    Math.max(
      1,
      Math.min(
        opcoes.limite ?? 10,
        50
      )
    )

  const salvarCompativeis =
    opcoes.salvarCompativeis ??
    false

  const selecionadas =
    selecionarCandidatas(
      paginas,
      limite
    )

  const vagasResolvidas:
    VagaResolvida[] = []

  const naoResolvidas:
    DescobertaNaoResolvida[] = []

  let compativeisBrasil = 0
  let incompativeisBrasil = 0
  let indefinidas = 0
  let importadas = 0
  let duplicadas = 0

  for (
    const pagina
    of selecionadas
  ) {
    console.log("")
    console.log(
      `[RESOLVENDO] ${pagina.titulo}`
    )

    console.log(
      `Origem: ${pagina.provedor}`
    )

    const resolucao =
      await resolverUmaDescoberta(
        pagina
      )

    if (!resolucao) {
      naoResolvidas.push({
        provedor:
          pagina.provedor,

        titulo:
          pagina.titulo,

        url:
          pagina.url,

        motivo:
          "Não encontrei uma publicação oficial suficientemente semelhante."
      })

      console.log(
        "Resultado: não resolvida"
      )

      continue
    }

    const {
      paginaOficial,
      vaga,
      urlFinal,
      similaridade,
      elegibilidadeBrasil
    } = resolucao

    const situacao =
      elegibilidadeBrasil
        ?.situacao ??
      "indefinida"

    if (
      situacao ===
      "compativel"
    ) {
      compativeisBrasil++
    } else if (
      situacao ===
      "incompativel"
    ) {
      incompativeisBrasil++
    } else {
      indefinidas++
    }

    let importada = false
    let duplicada = false

    if (
      salvarCompativeis &&
      situacao ===
        "compativel"
    ) {
      const novaVaga =
        converterVagaWebParaNovaVaga(
          paginaOficial,
          vaga,
          urlFinal
        )

      if (novaVaga) {
        try {
          await criarVaga(
            novaVaga
          )

          importada = true
          importadas++
        } catch (erro) {
          if (
            ehErroVagaDuplicada(
              erro
            )
          ) {
            duplicada = true
            duplicadas++
          } else {
            throw erro
          }
        }
      }
    }

    vagasResolvidas.push({
      origemDescoberta:
        pagina.provedor,

      tituloDescoberto:
        pagina.titulo,

      urlDescoberta:
        pagina.url,

      tituloOficial:
        vaga.titulo ??
        paginaOficial.titulo,

      empresa:
        vaga.empresa,

      urlOficial:
        vaga.urlCandidatura ??
        urlFinal,

      provedorOficial:
        paginaOficial.provedor,

      similaridadeTitulo:
        similaridade,

      localizacao:
        vaga.localizacao,

      remoto:
        vaga.remoto,

      elegibilidadeBrasil:
        situacao,

      importada,
      duplicada
    })

    console.log(
      `Resultado: resolvida em ${paginaOficial.provedor}`
    )

    console.log(
      `Título oficial: ${vaga.titulo}`
    )

    console.log(
      `Brasil: ${situacao}`
    )
  }

  return {
    candidatasRecebidas:
      paginas.length,

    candidatasSelecionadas:
      selecionadas.length,

    resolvidas:
      vagasResolvidas.length,

    compativeisBrasil,
    incompativeisBrasil,
    indefinidas,
    importadas,
    duplicadas,

    vagasResolvidas,
    naoResolvidas
  }
}