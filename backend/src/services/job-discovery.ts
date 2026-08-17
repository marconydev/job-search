import { mkdir, readFile, writeFile } from "node:fs/promises"

import { resolve } from "node:path"

import { gerarConsultasBuscaVagas } from "../config/search-queries.js"

import { buscarNaWeb } from "../discovery/brave-search.js"

import { classificarPagina } from "../discovery/page-classifier.js"

import type { PaginaClassificada, PaginaDescoberta } from "../types/discovery.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

type OpcoesDescoberta = {
  permitirBuscaLive?: boolean

  limiteChamadas?: number
}

type RegistroConsultaCache = {
  consultadoEm: string

  paginas: PaginaDescoberta[]
}

type CacheBuscas = {
  versao: 1

  consultas: Record<string, RegistroConsultaCache>

  chamadasPorDia: Record<string, number>
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

function caminhoCache() {
  return resolve(process.cwd(), ".cache", "brave-buscas.json")
}

function criarCacheVazio(): CacheBuscas {
  return {
    versao: 1,

    consultas: {},

    chamadasPorDia: {}
  }
}

async function carregarCache() {
  try {
    const conteudo = await readFile(caminhoCache(), "utf8")

    const cache = JSON.parse(conteudo) as CacheBuscas

    if (cache.versao !== 1 || !cache.consultas || !cache.chamadasPorDia) {
      return criarCacheVazio()
    }

    return cache
  } catch {
    return criarCacheVazio()
  }
}

async function salvarCache(cache: CacheBuscas) {
  const diretorio = resolve(process.cwd(), ".cache")

  await mkdir(diretorio, {
    recursive: true
  })

  await writeFile(caminhoCache(), JSON.stringify(cache, null, 2), "utf8")
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
 * Eu priorizo as estratégias diárias e depois uso o saldo disponível
 * para rotacionar as pesquisas detalhadas.
 *
 * Uma consulta já executada hoje não precisa ser repetida.
 */
function selecionarConsultas(cache: CacheBuscas, perfil: PerfilProfissional, limite: number) {
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

  return [...diarias, ...rotativas].slice(0, limite)
}

/**
 * Eu considero qualquer resultado ainda válido no cache para descobrir
 * quando ocorreu a última busca.
 *
 * Não amarro mais esse cálculo somente às estratégias atualmente
 * configuradas porque uma mudança no perfil não invalida imediatamente
 * as páginas que já encontrei.
 */
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

/**
 * Eu apenas leio o consumo e a situação atual do cache.
 *
 * Nenhuma chamada Brave é executada nesta função.
 */
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

  /**
   * Eu mantenho no cache resultados de estratégias antigas enquanto
   * ainda estiverem dentro do TTL.
   *
   * Alterar o perfil ou a forma de gerar consultas não deve apagar uma
   * vaga que eu encontrei ontem.
   */
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

/**
 * Eu executo novas pesquisas somente quando a chamada foi explicitamente
 * autorizada.
 *
 * O controle financeiro final continua nesta camada.
 */
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

  const consultas = selecionarConsultas(cache, perfil, limiteExecucao)

  if (consultas.length === 0) {
    console.log("")

    console.log("Brave: todas as estratégias selecionáveis já foram executadas hoje.")

    return
  }

  let consultasComSucesso = 0

  let consultasComFalha = 0

  let resultadosRecebidos = 0

  console.log("")

  console.log(
    `Brave: iniciando ${consultas.length} consulta(s). ` +
      `Consumo atual: ${consumidoHoje}/${LIMITE_DIARIO_BRAVE} hoje e ` +
      `${consumidoMes}/${LIMITE_MENSAL_BRAVE} no mês.`
  )

  for (const consulta of consultas) {
    /**
     * Eu registro a tentativa antes da requisição para que uma eventual
     * interrupção do processo não permita ultrapassar o orçamento.
     */
    cache.chamadasPorDia[hoje] = (cache.chamadasPorDia[hoje] ?? 0) + 1

    await salvarCache(cache)

    const numeroChamada = cache.chamadasPorDia[hoje]

    console.log("")

    console.log(`Brave: pesquisando ${numeroChamada}/${LIMITE_DIARIO_BRAVE}`)

    console.log(`Plataforma: ${consulta.plataforma} | Família: ${consulta.familia}`)

    console.log(`Consulta: ${consulta.texto}`)

    try {
      const resultado = await buscarNaWeb(consulta.texto)

      consultasComSucesso++

      resultadosRecebidos += resultado.paginas.length

      console.log(`Brave: ${resultado.paginas.length} resultado(s) recebido(s).`)

      /**
       * Somente uma chamada concluída substitui o resultado daquela
       * consulta.
       *
       * Se a chamada falhar, mantenho o cache anterior.
       */
      cache.consultas[consulta.texto] = {
        consultadoEm: new Date().toISOString(),

        paginas: resultado.paginas
      }

      await salvarCache(cache)
    } catch (erro) {
      consultasComFalha++

      console.error(`Falha na consulta Brave: ${consulta.texto}`)

      if (erro instanceof Error) {
        console.error(erro.message)
      } else {
        console.error(erro)
      }
    }
  }

  const consumoFinalHoje = cache.chamadasPorDia[hoje] ?? 0

  const consumoFinalMes = obterChamadasDoMes(cache)

  console.log("")

  console.log(
    [
      "Brave: execução concluída.",
      `${consultasComSucesso} consulta(s) com sucesso,`,
      `${consultasComFalha} com falha,`,
      `${resultadosRecebidos} resultado(s) recebidos.`
    ].join(" ")
  )

  console.log(
    `Brave: consumo ${consumoFinalHoje}/${LIMITE_DIARIO_BRAVE} hoje e ` +
      `${consumoFinalMes}/${LIMITE_MENSAL_BRAVE} no mês.`
  )
}

/**
 * Eu reutilizo todas as páginas ainda dentro do período válido,
 * independentemente de a consulta que as encontrou continuar ativa.
 */
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

/**
 * A descoberta funciona em modo cache-first.
 *
 * O perfil define quais novas consultas podem ser executadas, mas não
 * elimina resultados anteriores ainda válidos.
 */
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
