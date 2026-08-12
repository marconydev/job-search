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

export type JobMatchStatus =
  | "relevant"
  | "viewed"
  | "discarded"
  | "applied"
  | "ignored"

/**
 * Estes são os estados que posso escolher manualmente pelo dashboard.
 *
 * Não exponho "discarded" como ação normal porque ele é utilizado
 * internamente pelo matcher.
 */
export type UserJobStatus =
  | "relevant"
  | "viewed"
  | "applied"
  | "ignored"

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