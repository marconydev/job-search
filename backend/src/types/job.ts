export type WorkplaceType = "remote" | "hybrid" | "on-site" | "unknown"

export type NewJob = {
  source: string

  externalId: string

  company: string

  title: string

  description: string

  location: string | null

  remote: boolean

  /**
   * Modalidade estruturada da fonte.
   *
   * "remote"  → remoto puro.
   * "hybrid"  → modelo híbrido (aceito no Brasil).
   * "on-site" → presencial (restrito a João Pessoa/PB).
   * "unknown" → a fonte não informou.
   *
   * Quando ausente, o matcher cai de volta para o booleano `remote`.
   */
  workplaceType?: WorkplaceType

  url: string

  publishedAt: string | null

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

  workplace_type?: string | null

  url: string

  published_at: string | null

  partial: boolean

  created_at: string

  source_key?: string | null

  last_seen_at?: string | null

  unavailable_at?: string | null

  content_hash?: string | null
}

export type JobMatchStatus = "relevant" | "discarded" | "applied" | "ignored"

export type UserJobStatus = "relevant" | "applied" | "ignored"

export type NewJobMatch = {
  jobId: number

  localScore: number

  matchedSkills: string[]

  reasons: string[]

  status: JobMatchStatus
}

export type JobMatch = {
  job: StoredJob

  score: number

  matchedSkills: string[]

  reasons: string[]
}
