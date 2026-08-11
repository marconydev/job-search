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
  ResultadoProcessamentoWeb,
  ResultadoFonteProcessada
} from "../types/processamento-web.js"

type OpcoesProcessamentoWeb = {
  salvarCompativeis?: boolean
}

const provedoresSuportados =
  new Set<ProvedorPagina>([
    "gupy",
    "lever",
    "greenhouse",
    "workable",
    "smartrecruiters"
  ])

/**
 * Verifico se já possuo uma estratégia confiável para extrair
 * oportunidades desta plataforma.
 */
function ehProvedorSuportado(
  pagina: PaginaClassificada
) {
  return provedoresSuportados.has(
    pagina.provedor
  )
}

/**
 * Crio os contadores usados para acompanhar cada plataforma.
 */
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
    resultados.get(provedor)

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

/**
 * Executo descoberta, inspeção e filtro geográfico.
 *
 * Quando habilito salvarCompativeis, gravo somente oportunidades cuja
 * elegibilidade para candidatos no Brasil esteja realmente confirmada.
 */
export async function processarVagasWeb(
  opcoes: OpcoesProcessamentoWeb = {}
): Promise<ResultadoProcessamentoWeb> {
  const salvarCompativeis =
    opcoes.salvarCompativeis ??
    false

  const paginas =
    await descobrirPaginasVagas()

  const paginasSelecionadas =
    paginas.filter(
      ehProvedorSuportado
    )

  const resultadosPorProvedor =
    new Map<
      ProvedorPagina,
      ResultadoFonteProcessada
    >()

  let vagasExtraidas = 0
  let compativeisBrasil = 0
  let incompativeisBrasil = 0
  let indefinidas = 0
  let importadas = 0
  let duplicadas = 0
  let semDadosObrigatorios = 0
  let falhas = 0

  /**
   * Processo sequencialmente para não disparar muitas requisições
   * simultâneas contra os ATS.
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

      console.error(
        `[${pagina.provedor}] Falha ao inspecionar: ${pagina.url}`
      )

      console.error(
        `Motivo: ${resultado.erro}`
      )

      continue
    }

    if (
      !resultado.vaga ||
      !resultado.ehPublicacaoVaga
    ) {
      resumo.ignoradas++
      continue
    }

    resumo.vagasValidas++
    vagasExtraidas++

    const elegibilidade =
      resultado.elegibilidadeBrasil

    if (!elegibilidade) {
      resumo.indefinidas++
      indefinidas++
      continue
    }

    if (
      elegibilidade.situacao ===
      "incompativel"
    ) {
      resumo.incompativeisBrasil++
      incompativeisBrasil++

      console.log("")
      console.log(
        `[IGNORADA - FORA DO BRASIL] ${
          resultado.vaga.titulo ??
          pagina.titulo
        }`
      )

      console.log(
        `Local: ${
          resultado.vaga.localizacao ??
          "não informado"
        }`
      )

      console.log(
        `Motivo: ${elegibilidade.motivo}`
      )

      continue
    }

    if (
      elegibilidade.situacao ===
      "indefinida"
    ) {
      resumo.indefinidas++
      indefinidas++

      console.log("")
      console.log(
        `[PENDENTE - LOCALIZAÇÃO INDEFINIDA] ${
          resultado.vaga.titulo ??
          pagina.titulo
        }`
      )

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

      console.log("")
      console.log(
        `[NÃO IMPORTADA - DADOS INCOMPLETOS] ${
          resultado.vaga.titulo ??
          pagina.titulo
        }`
      )

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

    paginasSelecionadas:
      paginasSelecionadas.length,

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
    ]
  }
}