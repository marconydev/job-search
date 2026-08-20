import { createHash } from "node:crypto"

import { inspecionarPaginaVaga } from "../discovery/page-inspector.js"

import {
  createJob as criarVaga,
  findJobBySourceExternalId as buscarVagaPorOrigemEIdExterno,
  isDuplicateJobError as ehErroVagaDuplicada
} from "../repositories/job-repository.js"

import { saveJobMatch as salvarCorrespondenciaVaga } from "../repositories/job-match-repository.js"

import type { ProvedorPagina } from "../types/discovery.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import type { StoredJob as VagaArmazenada } from "../types/job.js"

import type {
  PaginaSomenteDescoberta,
  PendenciaProcessamentoWeb,
  RecomendacaoDescoberta,
  ResultadoFonteProcessada,
  ResultadoPersistenciaDescoberta,
  ResultadoProcessamentoWeb
} from "../types/processamento-web.js"

import { converterVagaWebParaNovaVaga } from "./conversao-vaga-web.js"

import { avaliarElegibilidadeBrasil } from "./elegibilidade-localizacao.js"

import { descobrirPaginasVagas } from "./job-discovery.js"

import { matchJob as avaliarVaga } from "./job-matcher.js"

import {
  detectarTrabalhoRemoto,
  ehProvedorProcessavel,
  normalizarPaginaParaInspecao,
  paginaEhListagem,
  paginaEstaIndisponivel,
  paginaPareceConteudoInformativo,
  paginaPareceRelacionada
} from "./vagas-web/triagem-vagas-web.js"

import { registrarFontesAtsDescobertas } from "./fontes-ats.js"

type OpcoesProcessamentoWeb = {
  salvarCompativeis?: boolean

  /**
   * Chamadas reais à Brave só acontecem quando a execução autoriza
   * explicitamente uma atualização da descoberta.
   */
  permitirBuscaLive?: boolean

  /**
   * Limite solicitado para esta execução.
   *
   * O limite diário definitivo continua sendo controlado pelo serviço
   * responsável pela descoberta.
   */
  limiteChamadasBrave?: number
}

function criarResultadoProvedor(provedor: ProvedorPagina): ResultadoFonteProcessada {
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
  resultados: Map<ProvedorPagina, ResultadoFonteProcessada>,
  provedor: ProvedorPagina
) {
  const existente = resultados.get(provedor)

  if (existente) {
    return existente
  }

  const novo = criarResultadoProvedor(provedor)

  resultados.set(provedor, novo)

  return novo
}

function registrarPendencia(
  pendencias: PendenciaProcessamentoWeb[],
  pendencia: PendenciaProcessamentoWeb
) {
  pendencias.push(pendencia)
}

function avaliarPaginaDescoberta(
  pagina: PaginaSomenteDescoberta,
  perfil: PerfilProfissional
): RecomendacaoDescoberta | null {
  if (paginaPareceConteudoInformativo(pagina.titulo, pagina.url)) {
    return null
  }

  const elegibilidadeBrasil = avaliarElegibilidadeBrasil(null, pagina.descricao, pagina.titulo)

  if (elegibilidadeBrasil.situacao === "incompativel") {
    return null
  }

  const remoto = detectarTrabalhoRemoto(pagina)

  /**
   * Crio o objeto apenas em memória para reaproveitar o matcher.
   *
   * Uso "Brasil" somente depois que a própria oportunidade passou pela
   * validação geográfica. Esse valor não é persistido como localização.
   */
  const vagaTemporaria: VagaArmazenada = {
    id: 0,
    source: pagina.provedor,
    external_id: pagina.url,
    company: "",
    title: pagina.titulo,
    description: pagina.descricao ?? "",
    location:
      elegibilidadeBrasil.situacao === "compativel"
        ? "Brasil"
        : null,
    remote: remoto,
    url: pagina.url,
    published_at: null,
    partial: true,
    created_at: new Date(0).toISOString()
  }

  const correspondencia = avaliarVaga(vagaTemporaria, perfil)

  if (correspondencia.score < 60) {
    return null
  }

  return {
    provedor: pagina.provedor,

    titulo: pagina.titulo,

    url: pagina.url,

    descricao: pagina.descricao,

    consulta: pagina.consulta,

    pontuacao: correspondencia.score,

    competencias: correspondencia.matchedSkills,

    motivos: correspondencia.reasons
  }
}

function criarRecomendacoesDescoberta(
  paginas: PaginaSomenteDescoberta[],
  perfil: PerfilProfissional
) {
  return paginas
    .map(pagina => avaliarPaginaDescoberta(pagina, perfil))
    .filter((recomendacao): recomendacao is RecomendacaoDescoberta => recomendacao !== null)
    .sort((primeira, segunda) => {
      if (segunda.pontuacao !== primeira.pontuacao) {
        return segunda.pontuacao - primeira.pontuacao
      }

      return primeira.titulo.localeCompare(segunda.titulo, "pt-BR")
    })
}

function criarIdExternoDescoberta(recomendacao: RecomendacaoDescoberta) {
  const hash = createHash("sha256").update(recomendacao.url).digest("hex").slice(0, 48)

  return `web_${hash}`
}

function identificarEmpresaDescoberta(recomendacao: RecomendacaoDescoberta) {
  const titulo = recomendacao.titulo.trim()

  const padroes = [
    /^A empresa (.+?) está contratando/i,
    /^(.+?) hiring /i,
    /[-–—]\s*(.+?)\s*[-–—]\s*Vaga\b/i,
    /\s[-–—]\s*Vaga\s*[-–—]\s*(.+)$/i,
    /\s[-–—]\s*([^|]+?)\s*\|\s*BeBee$/i
  ]

  for (const padrao of padroes) {
    const resultado = titulo.match(padrao)

    const empresa = resultado?.[1]?.trim()

    if (empresa && empresa.length >= 2 && empresa.length <= 150) {
      return empresa
    }
  }

  return "Empresa não identificada"
}

function obterDescricaoDescoberta(recomendacao: RecomendacaoDescoberta) {
  const descricao = recomendacao.descricao?.trim()

  if (descricao) {
    return descricao
  }

  return (
    "Descrição ainda não disponível. " +
    "Esta oportunidade foi registrada a partir da descoberta da vaga."
  )
}

function criarResultadoPersistenciaVazio(): ResultadoPersistenciaDescoberta {
  return {
    novas: 0,
    atualizadas: 0,
    falhas: 0
  }
}

async function persistirRecomendacoesDescoberta(
  recomendacoes: RecomendacaoDescoberta[]
): Promise<ResultadoPersistenciaDescoberta> {
  const resultado = criarResultadoPersistenciaVazio()

  for (const recomendacao of recomendacoes) {
    try {
      const idExterno = criarIdExternoDescoberta(recomendacao)

      let vaga = await buscarVagaPorOrigemEIdExterno(recomendacao.provedor, idExterno)

      let criadaAgora = false

      if (!vaga) {
        try {
          vaga = await criarVaga({
            source: recomendacao.provedor,

            externalId: idExterno,

            company: identificarEmpresaDescoberta(recomendacao),

            title: recomendacao.titulo,

            description: obterDescricaoDescoberta(recomendacao),

            /**
             * Sei que a oportunidade passou pelo filtro do Brasil, mas
             * não invento cidade ou estado que não vieram da fonte.
             */
            location: null,

            remote: detectarTrabalhoRemoto(recomendacao),

            url: recomendacao.url,

            publishedAt: null,

            partial: true
          })

          criadaAgora = true
        } catch (erro) {
          /**
           * A vaga pode ser criada por outra execução entre a consulta e
           * o INSERT, portanto ainda trato a restrição de duplicidade.
           */
          if (!ehErroVagaDuplicada(erro)) {
            throw erro
          }

          vaga = await buscarVagaPorOrigemEIdExterno(recomendacao.provedor, idExterno)

          if (!vaga) {
            throw new Error(
              "A vaga foi identificada como duplicada, mas não consegui recuperá-la do banco."
            )
          }
        }
      }

      /**
       * O repositório preserva estados manuais como viewed, applied e
       * ignored quando a oportunidade já foi tratada no dashboard.
       */
      await salvarCorrespondenciaVaga({
        jobId: vaga.id,

        localScore: recomendacao.pontuacao,

        matchedSkills: recomendacao.competencias,

        reasons: recomendacao.motivos,

        status: "relevant"
      })

      if (criadaAgora) {
        resultado.novas++
      } else {
        resultado.atualizadas++
      }
    } catch (erro) {
      resultado.falhas++

      console.error(`Erro ao persistir descoberta "${recomendacao.titulo}":`, erro)
    }
  }

  return resultado
}

/**
 * Executo descoberta, triagem, extração, avaliação geográfica e,
 * opcionalmente, persistência.
 *
 * O perfil recebido é o mesmo utilizado pelo restante do pipeline.
 */
export async function processarVagasWeb(
  perfil: PerfilProfissional,
  opcoes: OpcoesProcessamentoWeb = {}
): Promise<ResultadoProcessamentoWeb> {
  const salvarCompativeis = opcoes.salvarCompativeis ?? false

  const paginas = await descobrirPaginasVagas(perfil, {
    permitirBuscaLive: opcoes.permitirBuscaLive,

    limiteChamadas: opcoes.limiteChamadasBrave
  })

  /**
   * Toda página de ATS encontrada também pode virar uma fonte direta.
   *
   * Faço isso antes da triagem porque até uma vaga que não seja perfeita
   * para o perfil pode revelar uma empresa cujo board possui outras vagas
   * interessantes.
   */
  await registrarFontesAtsDescobertas(paginas)

  const paginasRelacionadas = paginas.filter(pagina => paginaPareceRelacionada(pagina, perfil))

  const descartadasPorTitulo = paginas.length - paginasRelacionadas.length

  const paginasDeListagem = paginasRelacionadas.filter(paginaEhListagem).length

  const paginasIndividuais = paginasRelacionadas.filter(pagina => !paginaEhListagem(pagina))

  const paginasSelecionadas = paginasIndividuais
    .filter(ehProvedorProcessavel)
    .map(normalizarPaginaParaInspecao)

  const somenteDescoberta: PaginaSomenteDescoberta[] = paginasIndividuais
    .filter(pagina => !ehProvedorProcessavel(pagina))
    .map(pagina => ({
      provedor: pagina.provedor,

      titulo: pagina.titulo,

      url: pagina.url,

      descricao: pagina.descricao,

      consulta: pagina.consulta
    }))

  const recomendacoesDescoberta = criarRecomendacoesDescoberta(somenteDescoberta, perfil)

  const persistenciaDescoberta = salvarCompativeis
    ? await persistirRecomendacoesDescoberta(recomendacoesDescoberta)
    : criarResultadoPersistenciaVazio()

  const resultadosPorProvedor = new Map<ProvedorPagina, ResultadoFonteProcessada>()

  const pendencias: PendenciaProcessamentoWeb[] = []

  let vagasExtraidas = 0
  let compativeisBrasil = 0
  let incompativeisBrasil = 0
  let indefinidas = 0
  let importadas = 0
  let duplicadas = 0
  let semDadosObrigatorios = 0
  let falhas = 0

  /**
   * Mantenho o processamento estruturado sequencial para evitar pressão
   * desnecessária sobre os ATS e preservar comportamento previsível.
   */
  for (const pagina of paginasSelecionadas) {
    const resumo = obterResultadoProvedor(resultadosPorProvedor, pagina.provedor)

    resumo.encontradas++

    const resultado = await inspecionarPaginaVaga(pagina)

    if ("erro" in resultado) {
      resumo.falhas++
      falhas++

      registrarPendencia(pendencias, {
        tipo: "acesso",

        provedor: pagina.provedor,

        titulo: pagina.titulo,

        url: pagina.url,

        localizacao: null,

        motivo: resultado.erro
      })

      continue
    }

    if (!resultado.vaga || !resultado.ehPublicacaoVaga) {
      resumo.ignoradas++

      const indisponivel = paginaEstaIndisponivel(resultado.urlFinal, resultado.codigoStatus)

      registrarPendencia(pendencias, {
        tipo: indisponivel ? "indisponivel" : "extracao",

        provedor: pagina.provedor,

        titulo: pagina.titulo,

        url: resultado.urlFinal,

        localizacao: null,

        motivo: indisponivel
          ? "A publicação não está mais disponível no ATS."
          : "A página foi acessada, mas nenhum extrator conseguiu confirmar uma vaga válida."
      })

      continue
    }

    resumo.vagasValidas++
    vagasExtraidas++

    const elegibilidade = resultado.elegibilidadeBrasil

    if (!elegibilidade || elegibilidade.situacao === "indefinida") {
      resumo.indefinidas++
      indefinidas++

      registrarPendencia(pendencias, {
        tipo: "localizacao",

        provedor: resultado.provedor,

        titulo: resultado.vaga.titulo ?? pagina.titulo,

        url: resultado.urlFinal,

        localizacao: resultado.vaga.localizacao,

        motivo:
          elegibilidade?.motivo ??
          "A elegibilidade para o Brasil não foi avaliada."
      })

      /**
       * Não interrompo mais o processamento.
       *
       * A ausência de localização conclusiva não é evidência de
       * incompatibilidade.
       */
    } else if (elegibilidade.situacao === "incompativel") {
      resumo.incompativeisBrasil++
      incompativeisBrasil++

      continue
    } else {
      resumo.compativeisBrasil++
      compativeisBrasil++
    }

    /**
     * No diagnóstico a validação termina aqui, sem alterar jobs ou
     * job_matches.
     */
    if (!salvarCompativeis) {
      continue
    }

    const novaVaga = converterVagaWebParaNovaVaga(pagina, resultado.vaga, resultado.urlFinal)

    if (!novaVaga) {
      resumo.semDadosObrigatorios++
      semDadosObrigatorios++

      continue
    }

    try {
      await criarVaga(novaVaga)

      resumo.importadas++
      importadas++
    } catch (erro) {
      if (ehErroVagaDuplicada(erro)) {
        resumo.duplicadas++
        duplicadas++

        continue
      }

      throw erro
    }
  }

  return {
    paginasDescobertas: paginas.length,

    descartadasPorTitulo,

    paginasDeListagem,

    paginasSelecionadas: paginasSelecionadas.length,

    paginasSomenteDescoberta: somenteDescoberta.length,

    vagasExtraidas,

    compativeisBrasil,

    incompativeisBrasil,

    indefinidas,

    importadas,

    duplicadas,

    semDadosObrigatorios,

    falhas,

    persistenciaDescoberta,

    porProvedor: [...resultadosPorProvedor.values()],

    pendencias,

    somenteDescoberta,

    recomendacoesDescoberta
  }
}
