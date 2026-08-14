import { collectors } from "../collectors/index.js"

import { analyzePendingJobs } from "./job-analysis.js"

import { importJobs, type JobImportResult } from "./job-import.js"

import { processarVagasWeb } from "./processamento-vagas-web.js"

type ResultadoFonte = JobImportResult & {
  error?: string
}

type OpcoesSincronizacao = {
  usarBrave?: boolean

  limiteChamadasBrave?: number
}

async function coletarFontesDiretas(limite: number) {
  const resultados: ResultadoFonte[] = []

  for (const coletor of collectors) {
    try {
      const coleta = await coletor.collect(limite)

      const importacao = await importJobs(coleta)

      resultados.push(importacao)
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido durante a coleta"

      resultados.push({
        source: coletor.name,

        found: 0,

        inserted: 0,

        duplicates: 0,

        error: mensagem
      })
    }
  }

  return resultados
}

/**
 * Eu normalizo o limite recebido antes de liberar qualquer chamada
 * Brave.
 *
 * Mesmo com autorização explícita, nunca permito mais que seis chamadas
 * em uma única sincronização.
 */
function normalizarLimiteBrave(valor: number | undefined) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return 6
  }

  return Math.min(6, Math.max(0, Math.floor(valor)))
}

/**
 * Eu executo todo o Job Search por um único ponto de entrada.
 *
 * A Brave permanece desativada por padrão. Uma sincronização só pode
 * realizar novas buscas pagas quando essa autorização for recebida
 * explicitamente.
 */
export async function syncJobs(limite = 100, opcoes: OpcoesSincronizacao = {}) {
  const usarBrave = opcoes.usarBrave === true

  const limiteBrave = usarBrave ? normalizarLimiteBrave(opcoes.limiteChamadasBrave) : 0

  console.log("")

  console.log(
    usarBrave
      ? `Sincronização: Brave autorizada com limite de ${limiteBrave} chamada(s).`
      : "Sincronização: Brave desativada. Usando fontes diretas e cache."
  )

  const fontes = await coletarFontesDiretas(limite)

  const web = await processarVagasWeb({
    salvarCompativeis: true,

    permitirBuscaLive: usarBrave,

    limiteChamadasBrave: limiteBrave
  })

  const analise = await analyzePendingJobs()

  return {
    modo: {
      braveAutorizada: usarBrave,

      limiteBrave
    },

    fontes,

    web,

    analise: {
      analisadas: analise.analyzed,

      relevantes: analise.relevant,

      descartadas: analise.discarded
    }
  }
}
