import { Router } from "express"

import { collectRemotiveJobs } from "../collectors/remotive.js"

import {
  createJob,
  isDuplicateJobError,
  listJobs
} from "../repositories/job-repository.js"

import {
  listRelevantJobMatches
} from "../repositories/job-match-repository.js"

import { analyzePendingJobs } from "../services/job-analysis.js"
import { importJobs } from "../services/job-import.js"
import { syncJobs } from "../services/job-sync.js"

import type { NewJob } from "../types/job.js"

const jobsRouter = Router()

/**
 * Normaliza o limite usado pelas rotas de importação.
 *
 * Um limite máximo evita que um valor incorreto na URL provoque
 * uma coleta muito maior do que a esperada durante os testes.
 */
function getImportLimit(value: unknown) {
  const requestedLimit = Number(value)

  if (
    Number.isInteger(requestedLimit) &&
    requestedLimit > 0 &&
    requestedLimit <= 200
  ) {
    return requestedLimit
  }

  return 100
}

/**
 * Lista todas as vagas armazenadas no banco.
 *
 * Essa consulta é útil para administração e conferência das coletas.
 * Nem toda vaga daqui necessariamente passou pelo matcher.
 */
jobsRouter.get("/", async (_request, response) => {
  try {
    const jobs = await listJobs()

    return response.json(jobs)
  } catch (error) {
    console.error("Erro ao buscar vagas:", error)

    return response.status(500).json({
      message: "Não foi possível buscar as vagas"
    })
  }
})

/**
 * Retorna as vagas que já foram classificadas como relevantes.
 *
 * minScore apenas filtra os resultados existentes. Ele não recalcula
 * ou modifica a análise que já está salva no banco.
 */
jobsRouter.get("/relevant", async (request, response) => {
  const requestedScore = Number(request.query.minScore)

  const minScore =
    Number.isFinite(requestedScore) &&
    requestedScore >= 0 &&
    requestedScore <= 100
      ? requestedScore
      : 60

  try {
    const jobs = await listRelevantJobMatches(minScore)

    return response.json({
      total: jobs.length,
      minScore,
      jobs
    })
  } catch (error) {
    console.error("Erro ao buscar vagas relevantes:", error)

    return response.status(500).json({
      message: "Não foi possível buscar as vagas relevantes"
    })
  }
})

/**
 * Executa coleta, importação e análise em uma única operação.
 *
 * Essa será a base da execução automática diária do Job Search.
 */
jobsRouter.post("/sync", async (request, response) => {
  const limit = getImportLimit(request.query.limit)

  try {
    const result = await syncJobs(limit)

    return response.json(result)
  } catch (error) {
    console.error("Erro ao sincronizar vagas:", error)

    return response.status(500).json({
      message: "Não foi possível sincronizar as vagas"
    })
  }
})

/**
 * Analisa somente vagas que ainda não possuem um match salvo.
 *
 * Mantemos essa rota separada para facilitar testes e ajustes
 * no matcher sem precisar executar uma nova coleta.
 */
jobsRouter.post("/analyze", async (_request, response) => {
  try {
    const result = await analyzePendingJobs()

    return response.json(result)
  } catch (error) {
    console.error("Erro ao analisar vagas pendentes:", error)

    return response.status(500).json({
      message: "Não foi possível analisar as vagas"
    })
  }
})

/**
 * Executa somente a coleta e importação da Remotive.
 *
 * Essa rota ajuda a testar uma fonte isoladamente, sem disparar
 * o restante do processo de sincronização.
 */
jobsRouter.post("/import/remotive", async (request, response) => {
  const limit = getImportLimit(request.query.limit)

  try {
    const collection = await collectRemotiveJobs(limit)
    const result = await importJobs(collection)

    return response.json(result)
  } catch (error) {
    console.error("Erro ao importar vagas da Remotive:", error)

    return response.status(500).json({
      message: "Não foi possível importar as vagas da Remotive"
    })
  }
})

/**
 * Permite cadastrar manualmente uma vaga encontrada fora das
 * fontes que o sistema consulta automaticamente.
 */
jobsRouter.post("/", async (request, response) => {
  const {
    source,
    externalId,
    company,
    title,
    description,
    location,
    remote,
    url,
    publishedAt
  } = request.body

  // Esses dados formam o mínimo necessário para identificar
  // e posteriormente analisar uma oportunidade.
  if (!source || !externalId || !company || !title || !description || !url) {
    return response.status(400).json({
      message: "Preencha os campos obrigatórios"
    })
  }

  const job: NewJob = {
    source,
    externalId,
    company,
    title,
    description,
    location: location || null,
    remote: remote ?? false,
    url,
    publishedAt: publishedAt || null
  }

  try {
    const savedJob = await createJob(job)

    return response.status(201).json(savedJob)
  } catch (error) {
    // source + externalId formam uma chave única. Repetição significa
    // que a vaga já foi importada anteriormente.
    if (isDuplicateJobError(error)) {
      return response.status(409).json({
        message: "Essa vaga já foi cadastrada"
      })
    }

    console.error("Erro ao cadastrar vaga:", error)

    return response.status(500).json({
      message: "Não foi possível cadastrar a vaga"
    })
  }
})

export { jobsRouter }