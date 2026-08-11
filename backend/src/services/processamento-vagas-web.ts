import {
  perfilBusca
} from "../config/search-profile.js"

import {
  descobrirPaginasVagas
} from "./job-discovery.js"

import {
  converterVagaWebParaNovaVaga
} from "./conversao-vaga-web.js"

import {
  inspecionarPaginaVaga
} from "../discovery/page-inspector.js"

import {
  createJob as criarVaga,
  isDuplicateJobError as ehErroVagaDuplicada
} from "../repositories/job-repository.js"

import type {
  PaginaClassificada,
  ProvedorPagina
} from "../types/discovery.js"

import type {
  PaginaSomenteDescoberta,
  PendenciaProcessamentoWeb,
  ResultadoFonteProcessada,
  ResultadoProcessamentoWeb
} from "../types/processamento-web.js"

type OpcoesProcessamentoWeb = {
  salvarCompativeis?: boolean
}

const provedoresProcessaveis =
  new Set<ProvedorPagina>([
    "gupy",
    "lever",
    "greenhouse",
    "workable",
    "smartrecruiters"
  ])

/**
 * Mantenho alguns termos adicionais porque nem todo cargo aparece
 * exatamente com um dos nomes cadastrados no perfil principal.
 */
const termosComplementaresTitulo = [
  "help desk",
  "service desk",
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
  "customer onboarding"
]

function normalizarTexto(
  valor: string
) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function contemExpressao(
  texto: string,
  termo: string
) {
  const textoNormalizado =
    ` ${normalizarTexto(texto)} `

  const termoNormalizado =
    normalizarTexto(termo)

  if (!termoNormalizado) {
    return false
  }

  return textoNormalizado.includes(
    ` ${termoNormalizado} `
  )
}

/**
 * Faço um pré-filtro barato usando apenas o título retornado pela busca.
 *
 * Não estou decidindo se a vaga é relevante. Apenas evito abrir páginas
 * claramente sem relação com a minha busca, como Barista ou Bartender.
 */
function tituloPareceRelacionado(
  titulo: string
) {
  const cargos = [
    ...perfilBusca.cargosPrincipais,
    ...perfilBusca.cargosRelacionados,
    ...termosComplementaresTitulo
  ]

  return cargos.some(
    (cargo) =>
      contemExpressao(
        titulo,
        cargo
      )
  )
}

/**
 * Identifico páginas conhecidas que representam listas ou pesquisas,
 * e não uma oportunidade individual.
 */
function paginaEhListagem(
  pagina: PaginaClassificada
) {
  try {
    const url =
      new URL(pagina.url)

    const caminho =
      url.pathname.toLowerCase()

    if (
      pagina.provedor === "indeed"
    ) {
      return (
        !caminho.includes(
          "/viewjob"
        ) ||
        !url.searchParams.has(
          "jk"
        )
      )
    }

    if (
      pagina.provedor === "linkedin"
    ) {
      return !caminho.includes(
        "/jobs/view/"
      )
    }

    if (
      pagina.provedor === "greenhouse"
    ) {
      return !/\/jobs\/\d+/i.test(
        caminho
      )
    }

    if (
      pagina.provedor === "workable"
    ) {
      return !/\/j\/[a-z0-9]+/i.test(
        caminho
      )
    }

    if (
      pagina.provedor ===
      "smartrecruiters"
    ) {
      const partes =
        caminho
          .split("/")
          .filter(Boolean)

      return (
        partes.length < 2 ||
        !/^\d+/.test(
          partes[1] ?? ""
        )
      )
    }

    if (
      pagina.provedor === "lever"
    ) {
      const partes =
        caminho
          .split("/")
          .filter(Boolean)

      return partes.length < 2
    }

    if (
      pagina.provedor === "gupy"
    ) {
      return !(
        caminho.includes(
          "/jobs/"
        ) ||
        caminho.includes(
          "/job/"
        )
      )
    }

    if (
      pagina.provedor === "remote-ok"
    ) {
      return (
        caminho === "/" ||
        caminho.includes(
          "customer-support-jobs"
        ) ||
        caminho.includes(
          "technical-jobs"
        ) ||
        caminho.includes(
          "jobs-in-brazil"
        ) ||
        caminho.includes(
          "product-manager-jobs"
        )
      )
    }

    return false
  } catch {
    return true
  }
}

/**
 * Algumas URLs da Workable apontam diretamente para /apply/.
 *
 * Para extração uso a página principal da vaga, que contém o código
 * necessário para consultar os dados estruturados.
 */
function normalizarPaginaParaInspecao(
  pagina: PaginaClassificada
): PaginaClassificada {
  if (
    pagina.provedor !==
    "workable"
  ) {
    return pagina
  }

  try {
    const url =
      new URL(pagina.url)

    url.pathname =
      url.pathname.replace(
        /\/apply\/?$/i,
        "/"
      )

    return {
      ...pagina,
      url:
        url.toString()
    }
  } catch {
    return pagina
  }
}

function ehProvedorProcessavel(
  pagina: PaginaClassificada
) {
  return provedoresProcessaveis.has(
    pagina.provedor
  )
}

function criarResultadoProvedor(
  provedor: ProvedorPagina
): ResultadoFonteProcessada {
  return {
    provedor,
    encontradas: 0,
    vagasValidas: 0,
    compativeisBrasil: 0,
    incompativeisBrasil: 0,
    indefinidas: 0,
    importadas: 0,
    duplicadas: 0,
    semDadosObrigatorios: 0,
    falhas: 0,
    ignoradas: 0
  }
}

function obterResultadoProvedor(
  resultados: Map<
    ProvedorPagina,
    ResultadoFonteProcessada
  >,
  provedor: ProvedorPagina
) {
  const existente =
    resultados.get(
      provedor
    )

  if (existente) {
    return existente
  }

  const novo =
    criarResultadoProvedor(
      provedor
    )

  resultados.set(
    provedor,
    novo
  )

  return novo
}

function registrarPendencia(
  pendencias:
    PendenciaProcessamentoWeb[],

  pendencia:
    PendenciaProcessamentoWeb
) {
  pendencias.push(
    pendencia
  )
}

function paginaEstaIndisponivel(
  url: string,
  codigoStatus: number
) {
  if (
    codigoStatus >= 400
  ) {
    return true
  }

  try {
    const urlAnalisada =
      new URL(url)

    return (
      urlAnalisada
        .searchParams
        .get("not_found") ===
        "true" ||
      urlAnalisada
        .searchParams
        .get("error") ===
        "true"
    )
  } catch {
    return false
  }
}

/**
 * Executo descoberta, pré-filtro, extração, elegibilidade e importação.
 *
 * LinkedIn, Indeed e demais fontes continuam preservados para a futura
 * resolução até a página oficial, desde que pareçam vagas individuais.
 */
export async function processarVagasWeb(
  opcoes: OpcoesProcessamentoWeb = {}
): Promise<ResultadoProcessamentoWeb> {
  const salvarCompativeis =
    opcoes.salvarCompativeis ??
    false

  const paginas =
    await descobrirPaginasVagas()

  const paginasRelacionadas =
    paginas.filter(
      (pagina) =>
        tituloPareceRelacionado(
          pagina.titulo
        )
    )

  const descartadasPorTitulo =
    paginas.length -
    paginasRelacionadas.length

  const paginasDeListagem =
    paginasRelacionadas.filter(
      paginaEhListagem
    ).length

  const paginasIndividuais =
    paginasRelacionadas.filter(
      (pagina) =>
        !paginaEhListagem(
          pagina
        )
    )

  const paginasSelecionadas =
    paginasIndividuais
      .filter(
        ehProvedorProcessavel
      )
      .map(
        normalizarPaginaParaInspecao
      )

  const somenteDescoberta:
    PaginaSomenteDescoberta[] =
    paginasIndividuais
      .filter(
        (pagina) =>
          !ehProvedorProcessavel(
            pagina
          )
      )
      .map(
        (pagina) => ({
          provedor:
            pagina.provedor,

          titulo:
            pagina.titulo,

          url:
            pagina.url,

          descricao:
            pagina.descricao,

          consulta:
            pagina.consulta
        })
      )

  const resultadosPorProvedor =
    new Map<
      ProvedorPagina,
      ResultadoFonteProcessada
    >()

  const pendencias:
    PendenciaProcessamentoWeb[] = []

  let vagasExtraidas = 0
  let compativeisBrasil = 0
  let incompativeisBrasil = 0
  let indefinidas = 0
  let importadas = 0
  let duplicadas = 0
  let semDadosObrigatorios = 0
  let falhas = 0

  /**
   * Processo os ATS sequencialmente para manter um comportamento
   * controlado durante a coleta.
   */
  for (
    const pagina
    of paginasSelecionadas
  ) {
    const resumo =
      obterResultadoProvedor(
        resultadosPorProvedor,
        pagina.provedor
      )

    resumo.encontradas++

    const resultado =
      await inspecionarPaginaVaga(
        pagina
      )

    if ("erro" in resultado) {
      resumo.falhas++
      falhas++

      registrarPendencia(
        pendencias,
        {
          tipo: "acesso",
          provedor:
            pagina.provedor,
          titulo:
            pagina.titulo,
          url:
            pagina.url,
          localizacao:
            null,
          motivo:
            resultado.erro
        }
      )

      continue
    }

    if (
      !resultado.vaga ||
      !resultado.ehPublicacaoVaga
    ) {
      resumo.ignoradas++

      const indisponivel =
        paginaEstaIndisponivel(
          resultado.urlFinal,
          resultado.codigoStatus
        )

      registrarPendencia(
        pendencias,
        {
          tipo:
            indisponivel
              ? "indisponivel"
              : "extracao",

          provedor:
            pagina.provedor,

          titulo:
            pagina.titulo,

          url:
            resultado.urlFinal,

          localizacao:
            null,

          motivo:
            indisponivel
              ? "A publicação não está mais disponível no ATS."
              : "A página foi acessada, mas nenhum extrator conseguiu confirmar uma vaga válida."
        }
      )

      continue
    }

    resumo.vagasValidas++
    vagasExtraidas++

    const elegibilidade =
      resultado.elegibilidadeBrasil

    if (
      !elegibilidade ||
      elegibilidade.situacao ===
        "indefinida"
    ) {
      resumo.indefinidas++
      indefinidas++

      registrarPendencia(
        pendencias,
        {
          tipo:
            "localizacao",

          provedor:
            resultado.provedor,

          titulo:
            resultado.vaga.titulo ??
            pagina.titulo,

          url:
            resultado.urlFinal,

          localizacao:
            resultado.vaga.localizacao,

          motivo:
            elegibilidade?.motivo ??
            "A elegibilidade para o Brasil não foi avaliada."
        }
      )

      continue
    }

    if (
      elegibilidade.situacao ===
      "incompativel"
    ) {
      resumo.incompativeisBrasil++
      incompativeisBrasil++

      continue
    }

    resumo.compativeisBrasil++
    compativeisBrasil++

    if (!salvarCompativeis) {
      continue
    }

    const novaVaga =
      converterVagaWebParaNovaVaga(
        pagina,
        resultado.vaga,
        resultado.urlFinal
      )

    if (!novaVaga) {
      resumo.semDadosObrigatorios++
      semDadosObrigatorios++
      continue
    }

    try {
      await criarVaga(
        novaVaga
      )

      resumo.importadas++
      importadas++
    } catch (erro) {
      if (
        ehErroVagaDuplicada(
          erro
        )
      ) {
        resumo.duplicadas++
        duplicadas++
        continue
      }

      throw erro
    }
  }

  return {
    paginasDescobertas:
      paginas.length,

    descartadasPorTitulo,

    paginasDeListagem,

    paginasSelecionadas:
      paginasSelecionadas.length,

    paginasSomenteDescoberta:
      somenteDescoberta.length,

    vagasExtraidas,
    compativeisBrasil,
    incompativeisBrasil,
    indefinidas,
    importadas,
    duplicadas,
    semDadosObrigatorios,
    falhas,

    porProvedor: [
      ...resultadosPorProvedor.values()
    ],

    pendencias,

    somenteDescoberta
  }
}