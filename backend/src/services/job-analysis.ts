import { saveJobMatch } from "../repositories/job-match-repository.js"
import { listUnmatchedJobs } from "../repositories/job-repository.js"

import { matchJob } from "./job-matcher.js"

import type {
  JobMatchStatus,
  StoredJob
} from "../types/job.js"

const RELEVANT_SCORE = 60

function getMatchStatus(score: number): JobMatchStatus {
  return score >= RELEVANT_SCORE
    ? "relevant"
    : "discarded"
}

export async function analyzePendingJobs() {
  const jobs = (await listUnmatchedJobs()) as StoredJob[]

  let relevant = 0
  let discarded = 0

  for (const job of jobs) {
    const match = matchJob(job)
    const status = getMatchStatus(match.score)

    await saveJobMatch({
      jobId: job.id,
      localScore: match.score,
      matchedSkills: match.matchedSkills,
      reasons: match.reasons,
      status
    })

    if (status === "relevant") {
      relevant++
    } else {
      discarded++
    }
  }

  return {
    analyzed: jobs.length,
    relevant,
    discarded
  }
}