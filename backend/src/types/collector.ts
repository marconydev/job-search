import type { NewJob } from "./job.js"

import type { PerfilProfissional } from "./perfil-profissional.js"

export type JobCollection = {
  source: string

  jobs: NewJob[]
}

/**
 * O perfil é opcional para manter compatibilidade com os coletores
 * antigos, que não precisam conhecer os cargos buscados.
 *
 * Coletores de portais agregadores, como Gupy, podem usar o perfil
 * para executar buscas equivalentes às que o usuário faria
 * manualmente no portal.
 */
export type JobCollector = {
  name: string

  collect: (limit?: number, perfil?: PerfilProfissional) => Promise<JobCollection>
}