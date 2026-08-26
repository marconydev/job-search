export type NewJob = {
  source: string

  externalId: string

  company: string

  title: string

  description: string

  location: string | null

  remote: boolean

  url: string

  publishedAt: string | null

  /**
   * Marco como parcial quando salvei a oportunidade usando apenas
   * informações da descoberta, sem conseguir extrair a publicação
   * completa no site original.
   */
  partial?: boolean
}

export type StoredJob = {
  id: number

  source: string

  external_id: string

  company: string

  title: string

  description: string

  location: string | null

  remote: boolean

  url: string

  published_at: string | null

  partial: boolean

  created_at: string
}

/**
 * Status representa o estado operacional da oportunidade.
 *
 * "Vista" não é mais um status: a visualização é registrada em
 * viewed_at sem retirar a vaga da fila de oportunidades em aberto.
 */
export type JobMatchStatus = "relevant" | "discarded" | "applied" | "ignored"

/**
 * Estados que o usuário pode escolher manualmente pelo dashboard.
 *
 * "discarded" continua reservado ao matcher.
 */
export type UserJobStatus = "relevant" | "applied" | "ignored"

export type JobMatch = {
  job: StoredJob

  score: number

  matchedSkills: string[]

  reasons: string[]
}

export type NewJobMatch = {
  jobId: number

  localScore: number

  matchedSkills: string[]

  reasons: string[]

  status: JobMatchStatus
}
