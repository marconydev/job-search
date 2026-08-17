import { Router } from "express"

import { collectRemotiveJobs } from "../collectors/remotive.js"

import { createJob, isDuplicateJobError, listJobs } from "../repositories/job-repository.js"

import {
  getJobDashboardSummary,
  isUserJobStatus,
  listDashboardJobMatches,
  listRelevantJobMatches,
  updateJobMatchStatus
} from "../repositories/job-match-repository.js"

import { analyzePendingJobs } from "../services/job-analysis.js"

import { importJobs } from "../services/job-import.js"

import { syncJobs } from "../services/job-sync.js"

import { obterStatusDescobertaWeb } from "../services/job-discovery.js"

import { obterPerfilProfissional } from "../services/perfil-profissional-service.js"

import type { NewJob } from "../types/job.js"

const jobsRouter = Router()

function getImportLimit(value: unknown) {
  const requestedLimit = Number(value)

  if (Number.isInteger(requestedLimit) && requestedLimit > 0 && requestedLimit <= 200) {
    return requestedLimit
  }

  return 100
}

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

jobsRouter.get("/dashboard", async (_request, response) => {
  try {
    const [resumo, vagas] = await Promise.all([getJobDashboardSummary(), listDashboardJobMatches()])

    return response.json({
      resumo,
      total: vagas.length,
      vagas
    })
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error)

    return response.status(500).json({
      message: "Não foi possível carregar o dashboard"
    })
  }
})

jobsRouter.get("/relevant", async (request, response) => {
  const requestedScore = Number(request.query.minScore)

  const minScore =
    Number.isFinite(requestedScore) && requestedScore >= 0 && requestedScore <= 100
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

jobsRouter.patch("/:id/status", async (request, response) => {
  const jobId = Number(request.params.id)

  if (!Number.isInteger(jobId) || jobId <= 0) {
    return response.status(400).json({
      message: "Identificador da vaga inválido"
    })
  }

  const status = request.body?.status

  if (!isUserJobStatus(status)) {
    return response.status(400).json({
      message: "Status inválido"
    })
  }

  try {
    const atualizado = await updateJobMatchStatus(jobId, status)

    if (!atualizado) {
      return response.status(404).json({
        message: "Vaga analisada não encontrada"
      })
    }

    return response.json(atualizado)
  } catch (error) {
    console.error("Erro ao atualizar status da vaga:", error)

    return response.status(500).json({
      message: "Não foi possível atualizar o status da vaga"
    })
  }
})

jobsRouter.get("/sync/status", async (_request, response) => {
  try {
    const status = await obterStatusDescobertaWeb()

    return response.json(status)
  } catch (error) {
    console.error("Erro ao consultar status da descoberta:", error)

    return response.status(500).json({
      message: "Não foi possível consultar o status da descoberta"
    })
  }
})

jobsRouter.post("/sync", async (request, response) => {
  const limit = getImportLimit(request.query.limit)

  const usarBrave = request.body?.usarBrave === true

  const limiteSolicitado = Number(request.body?.limiteChamadasBrave)

  const limiteChamadasBrave = Number.isFinite(limiteSolicitado)
    ? Math.max(0, Math.floor(limiteSolicitado))
    : 30
  try {
    const dadosPerfil = await obterPerfilProfissional()

    const result = await syncJobs(dadosPerfil.perfil, limit, {
      usarBrave,
      limiteChamadasBrave
    })

    return response.json(result)
  } catch (error) {
    console.error("Erro ao sincronizar vagas:", error)

    return response.status(500).json({
      message: "Não foi possível sincronizar as vagas"
    })
  }
})

jobsRouter.post("/analyze", async (_request, response) => {
  try {
    const dadosPerfil = await obterPerfilProfissional()

    const result = await analyzePendingJobs(dadosPerfil.perfil)

    return response.json(result)
  } catch (error) {
    console.error("Erro ao analisar vagas pendentes:", error)

    return response.status(500).json({
      message: "Não foi possível analisar as vagas"
    })
  }
})

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

jobsRouter.post("/", async (request, response) => {
  const { source, externalId, company, title, description, location, remote, url, publishedAt } =
    request.body

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
    publishedAt: publishedAt || null,
    partial: false
  }

  try {
    const savedJob = await createJob(job)

    return response.status(201).json(savedJob)
  } catch (error) {
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
