import { readFile } from "node:fs/promises"

import { resolve } from "node:path"

import { gerarConsultasBuscaVagas } from "../config/search-queries.js"

import { buscarNaWeb } from "../discovery/brave-search.js"

import { classificarPagina } from "../discovery/page-classifier.js"

import {
  buscarControleBuscaWeb,
  cacheBuscaEhValido,
  salvarControleBuscaWeb
} from "../repositories/controle-busca-web-repository.js"

import type {
  CacheBuscas,
  RegistroConsultaCache
} from "../repositories/controle-busca-web-repository.js"

import type { PaginaClassificada, PaginaDescoberta } from "../types/discovery.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

type OpcoesDescoberta = {
  permitirBuscaLive?: boolean

  limiteChamadas?: number
}

export type StatusDescobertaWeb = {
  data: string

  limiteDiario: number

  chamadasHoje: number

  chamadasRestantes: number

  limiteMensal: number

  chamadasMes: number

  chamadasRestantesMes: number

  consultasConfiguradas: number

  consultasEmCache: number

  consultasAtivas: number

  ultimaAtualizacao: string | null
}

const LIMITE_DIARIO_BRAVE = 30

const LIMITE_MENSAL_BRAVE = 1000

const DIAS_MAXIMOS_CACHE = 7

const parametrosRastreamento = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "trackingId",
  "refId",
  "currentJobId",
  "position",
  "pageNum",
  "jobBoardSource"
])

function caminhoCacheLegado() {
  return resolve(process.cwd(), ".cache", "brave-buscas.json")
}

function criarCacheVazio(): CacheBuscas {
  return {
    versao: 1,

    consultas: {},

    chamadasPorDia: {}
  }
}

async function carregarCacheLegado(): Promise<CacheBuscas | null> {
  try {
    const conteudo = await readFile(caminhoCacheLegado(), "utf8")

    const dados = JSON.parse(conteudo) as unknown

    if (!cacheBuscaEhValido(dados)) {
      return null
    }

    return dados
  } catch {
    return null
  }
}

async function carregarCache() {
  const armazenado = await buscarControleBuscaWeb()

  if (armazenado) {
    return armazenado
  }

  const legado = await carregarCacheLegado()

  const cache = legado ?? criarCacheVazio()

  await salvarControleBuscaWeb(cache)

  if (legado) {
    console.log("Brave: cache local anterior importado para o PostgreSQL.")
  }

  return cache
}

async function salvarCache(cache: CacheBuscas) {
  await salvarControleBuscaWeb(cache)
}

function formatarDataLocal(data: Date) {
  const ano = data.getFullYear()

  const mes = String(data.getMonth() + 1).padStart(2, "0")

  const dia = String(data.getDate()).padStart(2, "0")

  return `${ano}-${mes}-${dia}`
}

function obterDataLocal() {
  return formatarDataLocal(new Date())
}

function obterMesLocal() {
  return obterDataLocal().slice(0, 7)
}

function obterChamadasDoMes(cache: CacheBuscas) {
  const mesAtual = obterMesLocal()

  return Object.entries(cache.chamadasPorDia)
    .filter(([data]) => data.startsWith(mesAtual))
    .reduce((total, [, quantidade]) => total + quantidade, 0)
}

function registroAindaEhUtil(registro: RegistroConsultaCache) {
  const consultadoEm = new Date(registro.consultadoEm).getTime()

  if (!Number.isFinite(consultadoEm)) {
    return false
  }

  const idade = Date.now() - consultadoEm

  const limite = DIAS_MAXIMOS_CACHE * 24 * 60 * 60 * 1000

  return idade <= limite
}

function registroFoiConsultadoHoje(registro: RegistroConsultaCache) {
  const data = new Date(registro.consultadoEm)

  if (Number.isNaN(data.getTime())) {
    return false
  }

  return formatarDataLocal(data) === obterDataLocal()
}

function timestampConsulta(cache: CacheBuscas, consulta: string) {
  const registro = cache.consultas[consulta]

  if (!registro) {
    return 0
  }

  const horario = new Date(registro.consultadoEm).getTime()

  return Number.isFinite(horario) ? horario : 0
}

/**
 * Eu devolvo as estratégias em ordem de prioridade.
 *
 * Não corto pela quantidade de consultas aqui porque uma estratégia pode
 * consumir uma ou duas chamadas Brave. O orçamento real é controlado no
 * momento de cada requisição.
 */
function selecionarConsultas(cache: CacheBuscas, perfil: PerfilProfissional) {
  const configuradas = gerarConsultasBuscaVagas(perfil)

  const pendentesHoje = configuradas.filter(consulta => {
    const registro = cache.consultas[consulta.texto]

    return !registro || !registroFoiConsultadoHoje(registro)
  })

  const diarias = pendentesHoje
    .filter(consulta => consulta.recorrencia === "diaria")
    .sort(
      (primeira, segunda) =>
        timestampConsulta(cache, primeira.texto) - timestampConsulta(cache, segunda.texto)
    )

  const rotativas = pendentesHoje
    .filter(consulta => consulta.recorrencia === "rotativa")
    .sort(
      (primeira, segunda) =>
        timestampConsulta(cache, primeira.texto) - timestampConsulta(cache, segunda.texto)
    )

  return [...diarias, ...rotativas]
}

function obterUltimaAtualizacao(cache: CacheBuscas) {
  let ultima: number | null = null

  for (const registro of Object.values(cache.consultas)) {
    const horario = new Date(registro.consultadoEm).getTime()

    if (!Number.isFinite(horario)) {
      continue
    }

    if (ultima === null || horario > ultima) {
      ultima = horario
    }
  }

  return ultima === null ? null : new Date(ultima).toISOString()
}

export async function obterStatusDescobertaWeb(
  perfil: PerfilProfissional
): Promise<StatusDescobertaWeb> {
  const cache = await carregarCache()

  const consultas = gerarConsultasBuscaVagas(perfil)

  const hoje = obterDataLocal()

  const chamadasHoje = Math.min(cache.chamadasPorDia[hoje] ?? 0, LIMITE_DIARIO_BRAVE)

  const chamadasMes = Math.min(obterChamadasDoMes(cache), LIMITE_MENSAL_BRAVE)

  const restanteDiario = Math.max(0, LIMITE_DIARIO_BRAVE - chamadasHoje)

  const restanteMensal = Math.max(0, LIMITE_MENSAL_BRAVE - chamadasMes)

  const chamadasRestantes = Math.min(restanteDiario, restanteMensal)

  const registrosCache = Object.values(cache.consultas)

  const consultasAtivas = registrosCache.filter(registroAindaEhUtil).length

  return {
    data: hoje,

    limiteDiario: LIMITE_DIARIO_BRAVE,

    chamadasHoje,

    chamadasRestantes,

    limiteMensal: LIMITE_MENSAL_BRAVE,

    chamadasMes,

    chamadasRestantesMes: restanteMensal,

    consultasConfiguradas: consultas.length,

    consultasEmCache: registrosCache.length,

    consultasAtivas,

    ultimaAtualizacao: obterUltimaAtualizacao(cache)
  }
}

function normalizarUrlParaComparacao(url: string) {
  try {
    const urlNormalizada = new URL(url)

    urlNormalizada.hash = ""

    for (const parametro of [...urlNormalizada.searchParams.keys()]) {
      if (parametrosRastreamento.has(parametro)) {
        urlNormalizada.searchParams.delete(parametro)
      }
    }

    urlNormalizada.searchParams.sort()

    if (urlNormalizada.pathname.length > 1) {
      urlNormalizada.pathname = urlNormalizada.pathname.replace(/\/+$/, "")
    }

    return urlNormalizada.toString().toLowerCase()
  } catch {
    return url.trim().toLowerCase()
  }
}

function adicionarPaginasSemDuplicar(
  destino: Map<string, PaginaDescoberta>,
  paginas: PaginaDescoberta[]
) {
  for (const pagina of paginas) {
    const chave = normalizarUrlParaComparacao(pagina.url)

    if (!destino.has(chave)) {
      destino.set(chave, pagina)
    }
  }
}

/**
 * Registro cada chamada antes da requisição.
 *
 * Assim uma queda do processo nunca permite ultrapassar o orçamento.
 */
async function registrarTentativaBrave(cache: CacheBuscas, hoje: string) {
  cache.chamadasPorDia[hoje] = (cache.chamadasPorDia[hoje] ?? 0) + 1

  await salvarCache(cache)

  return cache.chamadasPorDia[hoje]
}

async function atualizarBuscasLive(
  cache: CacheBuscas,
  perfil: PerfilProfissional,
  limiteSolicitado: number
) {
  const hoje = obterDataLocal()

  const consumidoHoje = cache.chamadasPorDia[hoje] ?? 0

  const consumidoMes = obterChamadasDoMes(cache)

  const restanteDiario = Math.max(0, LIMITE_DIARIO_BRAVE - consumidoHoje)

  const restanteMensal = Math.max(0, LIMITE_MENSAL_BRAVE - consumidoMes)

  const limiteNormalizado = Math.max(0, Math.floor(limiteSolicitado))

  const limiteExecucao = Math.min(limiteNormalizado, restanteDiario, restanteMensal)

  if (limiteExecucao === 0) {
    console.log("")

    if (restanteMensal === 0) {
      console.log("Brave: limite mensal atingido. Usando somente cache.")
    } else if (restanteDiario === 0) {
      console.log("Brave: limite diário atingido. Usando somente cache.")
    } else {
      console.log("Brave: nenhuma chamada foi solicitada nesta execução.")
    }

    return
  }

  const consultas = selecionarConsultas(cache, perfil)

  if (consultas.length === 0) {
    console.log("")

    console.log("Brave: todas as estratégias selecionáveis já foram executadas hoje.")

    return
  }

  let chamadasExecutadas = 0

  let chamadasComSucesso = 0

  let chamadasComFalha = 0

  let consultasComSucesso = 0

  let consultasParciais = 0

  let consultasComFalha = 0

  let resultadosRecebidos = 0

  console.log("")

  console.log(
    `Brave: ${consultas.length} estratégia(s) pendente(s). ` +
      `Até ${limiteExecucao} chamada(s) poderão ser executadas. ` +
      `Consumo atual: ${consumidoHoje}/${LIMITE_DIARIO_BRAVE} hoje e ` +
      `${consumidoMes}/${LIMITE_MENSAL_BRAVE} no mês.`
  )

  for (const consulta of consultas) {
    if (chamadasExecutadas >= limiteExecucao) {
      break
    }

    const paginasConsulta = new Map<string, PaginaDescoberta>()

    const paginasMaximas = Math.min(Math.max(consulta.paginasMaximas, 1), 10)

    let consultaTeveSucesso = false

    let consultaTeveFalha = false

    let maisResultados = true

    for (
      let pagina = 0;
      pagina < paginasMaximas && maisResultados && chamadasExecutadas < limiteExecucao;
      pagina++
    ) {
      const numeroChamada = await registrarTentativaBrave(cache, hoje)

      chamadasExecutadas++

      console.log("")

      console.log(`Brave: pesquisando ${numeroChamada}/${LIMITE_DIARIO_BRAVE}`)

      console.log(
        `Plataforma: ${consulta.plataforma} | ` +
          `Família: ${consulta.familia} | ` +
          `Página: ${pagina + 1}/${paginasMaximas}`
      )

      console.log(`Consulta: ${consulta.texto}`)

      try {
        const resultado = await buscarNaWeb(consulta.texto, 20, pagina)

        chamadasComSucesso++

        consultaTeveSucesso = true

        resultadosRecebidos += resultado.paginas.length

        adicionarPaginasSemDuplicar(paginasConsulta, resultado.paginas)

        maisResultados = resultado.maisResultadosDisponiveis

        console.log(`Brave: ${resultado.paginas.length} resultado(s) recebido(s) nesta página.`)

        if (!maisResultados) {
          console.log("Brave: não há outra página disponível para esta estratégia.")
        }
      } catch (erro) {
        chamadasComFalha++

        consultaTeveFalha = true

        console.error(`Falha na consulta Brave: ${consulta.texto} | página ${pagina + 1}`)

        if (erro instanceof Error) {
          console.error(erro.message)
        } else {
          console.error(erro)
        }

        break
      }
    }

    /**
     * Se pelo menos uma página funcionou, preservo os resultados obtidos.
     *
     * Uma falha na segunda página não deve jogar fora a primeira.
     */
    if (consultaTeveSucesso) {
      cache.consultas[consulta.texto] = {
        consultadoEm: new Date().toISOString(),

        paginas: [...paginasConsulta.values()]
      }

      await salvarCache(cache)

      if (consultaTeveFalha) {
        consultasParciais++
      } else {
        consultasComSucesso++
      }

      continue
    }

    if (consultaTeveFalha) {
      consultasComFalha++
    }
  }

  const consumoFinalHoje = cache.chamadasPorDia[hoje] ?? 0

  const consumoFinalMes = obterChamadasDoMes(cache)

  console.log("")

  console.log(
    [
      "Brave: execução concluída.",
      `${chamadasExecutadas} chamada(s) executada(s),`,
      `${chamadasComSucesso} com sucesso,`,
      `${chamadasComFalha} com falha,`,
      `${resultadosRecebidos} resultado(s) recebidos.`
    ].join(" ")
  )

  console.log(
    [
      "Brave: estratégias:",
      `${consultasComSucesso} concluída(s),`,
      `${consultasParciais} parcial(is),`,
      `${consultasComFalha} com falha total.`
    ].join(" ")
  )

  console.log(
    `Brave: consumo ${consumoFinalHoje}/${LIMITE_DIARIO_BRAVE} hoje e ` +
      `${consumoFinalMes}/${LIMITE_MENSAL_BRAVE} no mês.`
  )
}

function carregarPaginasCache(cache: CacheBuscas) {
  const paginas: PaginaDescoberta[] = []

  for (const registro of Object.values(cache.consultas)) {
    if (!registroAindaEhUtil(registro)) {
      continue
    }

    paginas.push(...registro.paginas)
  }

  return paginas
}

export async function descobrirPaginasVagas(
  perfil: PerfilProfissional,
  opcoes: OpcoesDescoberta = {}
): Promise<PaginaClassificada[]> {
  const cache = await carregarCache()

  if (opcoes.permitirBuscaLive) {
    await atualizarBuscasLive(cache, perfil, opcoes.limiteChamadas ?? LIMITE_DIARIO_BRAVE)
  }

  const paginas = carregarPaginasCache(cache)

  const descobertas = new Map<string, PaginaClassificada>()

  for (const pagina of paginas) {
    const chave = normalizarUrlParaComparacao(pagina.url)

    if (descobertas.has(chave)) {
      continue
    }

    descobertas.set(chave, classificarPagina(pagina))
  }

  return [...descobertas.values()]
}
