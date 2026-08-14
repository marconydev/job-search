import type { NewJob } from "./job.js"

export type JobCollection = {
  source: string
  jobs: NewJob[]
}

export type JobCollector = {
  name: string
  collect: (limit?: number) => Promise<JobCollection>
}
