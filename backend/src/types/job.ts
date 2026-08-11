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
  created_at: string
}

export type JobMatchStatus =
  | "relevant"
  | "discarded"
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