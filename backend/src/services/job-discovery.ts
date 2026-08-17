import { mkdir, readFile, writeFile } from "node:fs/promises"

import { resolve } from "node:path"

import { consultasBuscaVagas } from "../config/search-queries.js"

import { buscarNaWeb } from "../discovery/brave-search.js"

import { classificarPagina } from "../discovery/page-classifier.js"

import type { PaginaClassificada, PaginaDescoberta } from "../types/discovery.js"

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

  /**
   * Eu mantenho o consumo por data porque isso me permite controlar
   * tanto o limite diário quanto o orçamento acumulado do mês.
   */
  chamadasPorDia: Record<string, number>
}

type DiagnosticoAnterior = {
  geradoEm?: string

  resultado?: {
    somenteDescoberta?: Array<{
      titulo: string

      url: string

      descricao: string | null

      consulta: string
    }>
  }
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

/**
 * Com o orçamento atual eu trabalho com 30 consultas diárias.
 *
 * Em um mês de 31 dias isso representa no máximo 930 chamadas,
 * mantendo uma margem antes do limite mensal de 1.000.
 */
const LIMITE_DIARIO_BRAVE = 30

const LIMITE_MENSAL_BRAVE = 1000

/**
 * Eu continuo reaproveitando resultados recentes durante sete dias.
 *
 * Isso não impede uma consulta de ser atualizada novamente. O cache
 * serve para complementar a cobertura quando executo o modo econômico
 * ou quando alguma plataforma não retorna a vaga em uma busca posterior.
 */
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

/**
 * Eu uso a data local da máquina onde o backend está executando.
 *
 * Como a aplicação é de uso pessoal, isso evita que o contador diário
 * seja reiniciado no meio do dia por diferença entre UTC e horário local.
 */
function obterDataLocal() {
  const agora = new Date()

  const ano = agora.getFullYear()

  const mes = String(agora.getMonth() + 1).padStart(2, "0")

  const dia = String(agora.getDate()).padStart(2, "0")

  return `${ano}-${mes}-${dia}`
}

function obterMesLocal() {
  return obterDataLocal().slice(0, 7)
}

/**
 * Eu calculo o consumo mensal a partir do próprio histórico diário.
 *
 * Desta forma não preciso manter dois contadores independentes que
 * poderiam acabar divergindo entre si.
 */
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

function timestampConsulta(cache: CacheBuscas, consulta: string) {
  const registro = cache.consultas[consulta]

  if (!registro) {
    return 0
  }

  const horario = new Date(registro.consultadoEm).getTime()

  return Number.isFinite(horario) ? horario : 0
}

/**
 * Eu escolho primeiro as consultas que nunca executei e depois as que
 * estão há mais tempo sem atualização.
 *
 * Hoje o conjunto principal possui até 30 estratégias e pode ser
 * executado integralmente em um único dia. Mesmo assim mantenho a
 * ordenação porque ela protege a cobertura caso eu execute menos
 * consultas manualmente em algum momento.
 */
function ordenarConsultas(cache: CacheBuscas) {
  return [...consultasBuscaVagas].sort(
    (primeira, segunda) => timestampConsulta(cache, primeira) - timestampConsulta(cache, segunda)
  )
}

/**
 * Eu encontro a última consulta realmente concluída e armazenada.
 *
 * Uma tentativa que falhou pode consumir orçamento, mas não deve ser
 * apresentada como uma atualização bem-sucedida.
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

  if (ultima === null) {
    return null
  }

  return new Date(ultima).toISOString()
}

/**
 * Eu disponibilizo o consumo da descoberta sem realizar nenhuma
 * pesquisa na Brave.
 *
 * O frontend pode consultar este status com segurança sempre que
 * precisar atualizar os indicadores do painel.
 */
export async function obterStatusDescobertaWeb(): Promise<StatusDescobertaWeb> {
  const cache = await carregarCache()

  const hoje = obterDataLocal()

  const chamadasHoje = Math.min(cache.chamadasPorDia[hoje] ?? 0, LIMITE_DIARIO_BRAVE)

  const chamadasMes = Math.min(obterChamadasDoMes(cache), LIMITE_MENSAL_BRAVE)

  const restanteDiario = Math.max(0, LIMITE_DIARIO_BRAVE - chamadasHoje)

  const restanteMensal = Math.max(0, LIMITE_MENSAL_BRAVE - chamadasMes)

  /**
   * O que realmente posso utilizar agora é sempre o menor saldo entre
   * o limite diário e o limite mensal.
   */
  const chamadasRestantes = Math.min(restanteDiario, restanteMensal)

  const registros = Object.values(cache.consultas)

  const consultasAtivas = registros.filter(registroAindaEhUtil).length

  return {
    data: hoje,

    limiteDiario: LIMITE_DIARIO_BRAVE,

    chamadasHoje,

    chamadasRestantes,

    limiteMensal: LIMITE_MENSAL_BRAVE,

    chamadasMes,

    chamadasRestantesMes: restanteMensal,

    consultasConfiguradas: consultasBuscaVagas.length,

    consultasEmCache: registros.length,

    consultasAtivas,

    ultimaAtualizacao: obterUltimaAtualizacao(cache)
  }
}

/**
 * Eu recupero páginas do último diagnóstico para não perder resultados
 * que já haviam sido encontrados antes da criação do cache atual.
 */
async function carregarDiagnosticoAnterior(): Promise<PaginaDescoberta[]> {
  const arquivo = resolve(process.cwd(), ".cache", "ultimo-diagnostico-web.json")

  try {
    const conteudo = await readFile(arquivo, "utf8")

    const diagnostico = JSON.parse(conteudo) as DiagnosticoAnterior

    if (!diagnostico.geradoEm) {
      return []
    }

    const geradoEm = new Date(diagnostico.geradoEm).getTime()

    const idade = Date.now() - geradoEm

    const limite = DIAS_MAXIMOS_CACHE * 24 * 60 * 60 * 1000

    if (!Number.isFinite(geradoEm) || idade > limite) {
      return []
    }

    return (diagnostico.resultado?.somenteDescoberta ?? []).map(pagina => ({
      origem: "cache-diagnostico",

      consulta: pagina.consulta,

      titulo: pagina.titulo,

      url: pagina.url,

      descricao: pagina.descricao
    }))
  } catch {
    return []
  }
}

/**
 * Eu removo parâmetros que normalmente servem apenas para rastreamento.
 *
 * Assim a mesma vaga encontrada em consultas diferentes não aparece
 * várias vezes apenas porque a URL possui parâmetros diferentes.
 */
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
 * Eu faço novas pesquisas somente quando a execução foi explicitamente
 * autorizada.
 *
 * O limite diário e o teto mensal são aplicados aqui, na camada mais
 * próxima da chamada Brave. Desta forma outra rota ou serviço não
 * consegue ultrapassar acidentalmente o orçamento definido.
 */
async function atualizarBuscasLive(cache: CacheBuscas, limiteSolicitado: number) {
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

  const consultas = ordenarConsultas(cache).slice(0, limiteExecucao)

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
     * Eu contabilizo a tentativa antes da requisição.
     *
     * Isso impede que uma queda inesperada do processo permita ultrapassar
     * o orçamento em uma nova execução.
     *
     * O contador representa consumo/tentativas. Sucesso e falha são
     * acompanhados separadamente para não mascarar erros da Brave.
     */
    cache.chamadasPorDia[hoje] = (cache.chamadasPorDia[hoje] ?? 0) + 1

    await salvarCache(cache)

    const numeroChamada = cache.chamadasPorDia[hoje]

    console.log("")

    console.log(`Brave: pesquisando ${numeroChamada}/${LIMITE_DIARIO_BRAVE}`)

    console.log(`Consulta: ${consulta}`)

    try {
      const resultado = await buscarNaWeb(consulta)

      consultasComSucesso++

      resultadosRecebidos += resultado.paginas.length

      console.log(`Brave: ${resultado.paginas.length} resultado(s) recebido(s).`)

      /**
       * Somente uma pesquisa concluída substitui o cache daquela consulta.
       *
       * Se a Brave falhar, mantenho o resultado anterior para não perder
       * oportunidades que ainda estejam dentro da validade de sete dias.
       */
      cache.consultas[consulta] = {
        consultadoEm: new Date().toISOString(),

        paginas: resultado.paginas
      }

      await salvarCache(cache)
    } catch (erro) {
      consultasComFalha++

      console.error(`Falha na consulta Brave: ${consulta}`)

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
 * Eu reúno somente os registros de cache ainda considerados recentes.
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
 * A descoberta continua funcionando em modo cache-first.
 *
 * Quando permitirBuscaLive não estiver habilitado, nenhuma chamada à
 * Brave será feita.
 *
 * Quando estiver habilitado, primeiro atualizo as consultas permitidas
 * pelo orçamento e depois reúno cache, diagnóstico anterior e resultados
 * recém-obtidos.
 */
export async function descobrirPaginasVagas(
  opcoes: OpcoesDescoberta = {}
): Promise<PaginaClassificada[]> {
  const cache = await carregarCache()

  if (opcoes.permitirBuscaLive) {
    await atualizarBuscasLive(cache, opcoes.limiteChamadas ?? LIMITE_DIARIO_BRAVE)
  }

  const paginasCache = carregarPaginasCache(cache)

  const paginasAnteriores = await carregarDiagnosticoAnterior()

  const todasPaginas = [...paginasAnteriores, ...paginasCache]

  /**
   * Uma oportunidade pode ser encontrada pelo LinkedIn, por uma consulta
   * geral e por uma busca específica de tecnologia.
   *
   * Eu normalizo a URL e mantenho somente uma ocorrência antes de
   * continuar o processamento.
   */
  const paginasDescobertas = new Map<string, PaginaClassificada>()

  for (const pagina of todasPaginas) {
    const chave = normalizarUrlParaComparacao(pagina.url)

    if (paginasDescobertas.has(chave)) {
      continue
    }

    paginasDescobertas.set(chave, classificarPagina(pagina))
  }

  return [...paginasDescobertas.values()]
}
