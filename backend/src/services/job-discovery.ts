import {
  mkdir,
  readFile,
  writeFile
} from "node:fs/promises"

import {
  resolve
} from "node:path"

import {
  consultasBuscaVagas
} from "../config/search-queries.js"

import {
  buscarNaWeb
} from "../discovery/brave-search.js"

import {
  classificarPagina
} from "../discovery/page-classifier.js"

import type {
  PaginaClassificada,
  PaginaDescoberta
} from "../types/discovery.js"

type OpcoesDescoberta = {
  permitirBuscaLive?: boolean

  limiteChamadas?: number
}

type RegistroConsultaCache = {
  consultadoEm: string

  paginas:
    PaginaDescoberta[]
}

type CacheBuscas = {
  versao: 1

  consultas:
    Record<
      string,
      RegistroConsultaCache
    >

  chamadasPorDia:
    Record<
      string,
      number
    >
}

type DiagnosticoAnterior = {
  geradoEm?: string

  resultado?: {
    somenteDescoberta?: Array<{
      titulo: string

      url: string

      descricao:
        string | null

      consulta: string
    }>
  }
}

export type StatusDescobertaWeb = {
  data: string

  limiteDiario: number

  chamadasHoje: number

  chamadasRestantes: number

  consultasConfiguradas: number

  consultasEmCache: number

  consultasAtivas: number

  ultimaAtualizacao:
    string | null
}

const LIMITE_DIARIO_BRAVE =
  6

const DIAS_MAXIMOS_CACHE =
  7

const parametrosRastreamento =
  new Set([
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
  return resolve(
    process.cwd(),
    ".cache",
    "brave-buscas.json"
  )
}

function criarCacheVazio():
  CacheBuscas {
  return {
    versao:
      1,

    consultas:
      {},

    chamadasPorDia:
      {}
  }
}

async function carregarCache() {
  try {
    const conteudo =
      await readFile(
        caminhoCache(),
        "utf8"
      )

    const cache =
      JSON.parse(
        conteudo
      ) as CacheBuscas

    if (
      cache.versao !==
        1 ||
      !cache.consultas ||
      !cache.chamadasPorDia
    ) {
      return criarCacheVazio()
    }

    return cache
  } catch {
    return criarCacheVazio()
  }
}

async function salvarCache(
  cache:
    CacheBuscas
) {
  const diretorio =
    resolve(
      process.cwd(),
      ".cache"
    )

  await mkdir(
    diretorio,
    {
      recursive:
        true
    }
  )

  await writeFile(
    caminhoCache(),
    JSON.stringify(
      cache,
      null,
      2
    ),
    "utf8"
  )
}

function obterDataLocal() {
  const agora =
    new Date()

  const ano =
    agora.getFullYear()

  const mes =
    String(
      agora.getMonth() +
      1
    ).padStart(
      2,
      "0"
    )

  const dia =
    String(
      agora.getDate()
    ).padStart(
      2,
      "0"
    )

  return `${ano}-${mes}-${dia}`
}

function registroAindaEhUtil(
  registro:
    RegistroConsultaCache
) {
  const consultadoEm =
    new Date(
      registro.consultadoEm
    ).getTime()

  if (
    !Number.isFinite(
      consultadoEm
    )
  ) {
    return false
  }

  const idade =
    Date.now() -
    consultadoEm

  const limite =
    DIAS_MAXIMOS_CACHE *
    24 *
    60 *
    60 *
    1000

  return idade <= limite
}

function timestampConsulta(
  cache:
    CacheBuscas,

  consulta:
    string
) {
  const registro =
    cache.consultas[
      consulta
    ]

  if (!registro) {
    return 0
  }

  const horario =
    new Date(
      registro.consultadoEm
    ).getTime()

  return Number.isFinite(
    horario
  )
    ? horario
    : 0
}

/**
 * Eu escolho primeiro as consultas que nunca executei e depois as mais
 * antigas.
 *
 * Desta forma a cobertura vai sendo naturalmente rotacionada sem eu
 * precisar criar uma agenda individual para cada fonte.
 */
function ordenarConsultas(
  cache:
    CacheBuscas
) {
  return [
    ...consultasBuscaVagas
  ].sort(
    (
      primeira,
      segunda
    ) =>
      timestampConsulta(
        cache,
        primeira
      ) -
      timestampConsulta(
        cache,
        segunda
      )
  )
}

/**
 * Eu encontro a última consulta realmente concluída e armazenada.
 *
 * O contador diário registra uma tentativa antes da chamada, então não
 * utilizo esse contador para determinar o horário da última atualização.
 */
function obterUltimaAtualizacao(
  cache:
    CacheBuscas
) {
  let ultima:
    number | null =
    null

  for (
    const registro
    of Object.values(
      cache.consultas
    )
  ) {
    const horario =
      new Date(
        registro.consultadoEm
      ).getTime()

    if (
      !Number.isFinite(
        horario
      )
    ) {
      continue
    }

    if (
      ultima === null ||
      horario > ultima
    ) {
      ultima =
        horario
    }
  }

  if (
    ultima === null
  ) {
    return null
  }

  return new Date(
    ultima
  ).toISOString()
}

/**
 * Eu disponibilizo o estado do consumo da descoberta sem executar
 * nenhuma pesquisa.
 *
 * Esta função existe principalmente para o dashboard informar de forma
 * transparente quantas chamadas ainda podem ser utilizadas antes de o
 * usuário autorizar uma sincronização.
 */
export async function obterStatusDescobertaWeb():
  Promise<
    StatusDescobertaWeb
  > {
  const cache =
    await carregarCache()

  const hoje =
    obterDataLocal()

  const chamadasHoje =
    Math.min(
      cache.chamadasPorDia[
        hoje
      ] ?? 0,
      LIMITE_DIARIO_BRAVE
    )

  const registros =
    Object.values(
      cache.consultas
    )

  const consultasAtivas =
    registros.filter(
      registroAindaEhUtil
    ).length

  return {
    data:
      hoje,

    limiteDiario:
      LIMITE_DIARIO_BRAVE,

    chamadasHoje,

    chamadasRestantes:
      Math.max(
        0,
        LIMITE_DIARIO_BRAVE -
        chamadasHoje
      ),

    consultasConfiguradas:
      consultasBuscaVagas.length,

    consultasEmCache:
      registros.length,

    consultasAtivas,

    ultimaAtualizacao:
      obterUltimaAtualizacao(
        cache
      )
  }
}

/**
 * Eu recupero as páginas do último diagnóstico para não perder as
 * oportunidades que já foram pagas antes da criação do cache atual.
 */
async function carregarDiagnosticoAnterior():
  Promise<
    PaginaDescoberta[]
  > {
  const arquivo =
    resolve(
      process.cwd(),
      ".cache",
      "ultimo-diagnostico-web.json"
    )

  try {
    const conteudo =
      await readFile(
        arquivo,
        "utf8"
      )

    const diagnostico =
      JSON.parse(
        conteudo
      ) as DiagnosticoAnterior

    if (
      !diagnostico.geradoEm
    ) {
      return []
    }

    const geradoEm =
      new Date(
        diagnostico.geradoEm
      ).getTime()

    const idade =
      Date.now() -
      geradoEm

    const limite =
      DIAS_MAXIMOS_CACHE *
      24 *
      60 *
      60 *
      1000

    if (
      !Number.isFinite(
        geradoEm
      ) ||
      idade > limite
    ) {
      return []
    }

    return (
      diagnostico.resultado
        ?.somenteDescoberta ??
      []
    ).map(
      pagina => ({
        origem:
          "cache-diagnostico",

        consulta:
          pagina.consulta,

        titulo:
          pagina.titulo,

        url:
          pagina.url,

        descricao:
          pagina.descricao
      })
    )
  } catch {
    return []
  }
}

function normalizarUrlParaComparacao(
  url:
    string
) {
  try {
    const urlNormalizada =
      new URL(url)

    urlNormalizada.hash =
      ""

    for (
      const parametro
      of [
        ...urlNormalizada
          .searchParams
          .keys()
      ]
    ) {
      if (
        parametrosRastreamento.has(
          parametro
        )
      ) {
        urlNormalizada
          .searchParams
          .delete(
            parametro
          )
      }
    }

    urlNormalizada
      .searchParams
      .sort()

    if (
      urlNormalizada
        .pathname
        .length > 1
    ) {
      urlNormalizada.pathname =
        urlNormalizada.pathname
          .replace(
            /\/+$/,
            ""
          )
    }

    return urlNormalizada
      .toString()
      .toLowerCase()
  } catch {
    return url
      .trim()
      .toLowerCase()
  }
}

/**
 * Eu faço novas buscas somente quando a execução foi explicitamente
 * autorizada.
 *
 * Mesmo com autorização, continuo respeitando o limite diário persistido
 * em disco. Reiniciar o servidor não zera esse contador.
 */
async function atualizarBuscasLive(
  cache:
    CacheBuscas,

  limiteSolicitado:
    number
) {
  const hoje =
    obterDataLocal()

  const consumidoHoje =
    cache.chamadasPorDia[
      hoje
    ] ?? 0

  const restanteDiario =
    Math.max(
      0,
      LIMITE_DIARIO_BRAVE -
      consumidoHoje
    )

  const limiteExecucao =
    Math.min(
      Math.max(
        limiteSolicitado,
        0
      ),
      restanteDiario
    )

  if (
    limiteExecucao ===
    0
  ) {
    console.log("")

    console.log(
      "Brave: limite diário já atingido. Usando somente cache."
    )

    return
  }

  const consultas =
    ordenarConsultas(
      cache
    ).slice(
      0,
      limiteExecucao
    )

  for (
    const consulta
    of consultas
  ) {
    /**
     * Eu registro o consumo antes da chamada.
     *
     * Assim uma interrupção inesperada não permite ultrapassar o limite
     * diário em uma nova execução.
     */
    cache.chamadasPorDia[
      hoje
    ] =
      (
        cache.chamadasPorDia[
          hoje
        ] ?? 0
      ) + 1

    await salvarCache(
      cache
    )

    console.log(
      `Brave: pesquisando ${cache.chamadasPorDia[hoje]}/${LIMITE_DIARIO_BRAVE}`
    )

    try {
      const resultado =
        await buscarNaWeb(
          consulta
        )

      cache.consultas[
        consulta
      ] = {
        consultadoEm:
          new Date()
            .toISOString(),

        paginas:
          resultado.paginas
      }

      await salvarCache(
        cache
      )
    } catch (erro) {
      console.error(
        `Falha na consulta Brave: ${consulta}`,
        erro
      )
    }
  }
}

/**
 * Eu reúno somente os registros recentes disponíveis no cache.
 */
function carregarPaginasCache(
  cache:
    CacheBuscas
) {
  const paginas:
    PaginaDescoberta[] =
    []

  for (
    const registro
    of Object.values(
      cache.consultas
    )
  ) {
    if (
      !registroAindaEhUtil(
        registro
      )
    ) {
      continue
    }

    paginas.push(
      ...registro.paginas
    )
  }

  return paginas
}

/**
 * A descoberta funciona em modo cache-first.
 *
 * Quando permitirBuscaLive não está ativo, esta função não realiza
 * nenhuma chamada à Brave.
 */
export async function descobrirPaginasVagas(
  opcoes:
    OpcoesDescoberta = {}
): Promise<
  PaginaClassificada[]
> {
  const cache =
    await carregarCache()

  if (
    opcoes.permitirBuscaLive
  ) {
    await atualizarBuscasLive(
      cache,
      opcoes.limiteChamadas ??
      LIMITE_DIARIO_BRAVE
    )
  }

  const paginasCache =
    carregarPaginasCache(
      cache
    )

  const paginasAnteriores =
    await carregarDiagnosticoAnterior()

  const todasPaginas = [
    ...paginasAnteriores,
    ...paginasCache
  ]

  const paginasDescobertas =
    new Map<
      string,
      PaginaClassificada
    >()

  for (
    const pagina
    of todasPaginas
  ) {
    const chave =
      normalizarUrlParaComparacao(
        pagina.url
      )

    if (
      paginasDescobertas.has(
        chave
      )
    ) {
      continue
    }

    paginasDescobertas.set(
      chave,
      classificarPagina(
        pagina
      )
    )
  }

  return [
    ...paginasDescobertas
      .values()
  ]
}