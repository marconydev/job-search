import { searchProfile } from "../config/search-profile.js"
import type { JobMatch, StoredJob } from "../types/job.js"

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function removeHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalizeText(term)))
}

function findMatches(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(normalizeText(term)))
}

function isLocationCompatible(location: string) {
  if (!location) {
    return true
  }

  if (includesAny(location, searchProfile.acceptedLocations)) {
    return true
  }

  // Algumas fontes usam somente "Remote" quando não existe
  // uma limitação geográfica definida na descrição da vaga.
  return location === "remote" || location === "remoto"
}

export function matchJob(job: StoredJob): JobMatch {
  const title = normalizeText(job.title)
  const location = normalizeText(job.location ?? "")
  const description = normalizeText(removeHtml(job.description))

  const reasons: string[] = []

  if (includesAny(title, searchProfile.excludedTitles)) {
    return {
      job,
      score: 0,
      matchedSkills: [],
      reasons: ["Cargo fora da senioridade ou do tipo de vaga buscado"]
    }
  }

  if (!isLocationCompatible(location)) {
    return {
      job,
      score: 0,
      matchedSkills: [],
      reasons: ["Localização não compatível com a busca"]
    }
  }

  let score = 0

  const roleMatches = findMatches(title, searchProfile.targetRoles)

  if (roleMatches.length > 0) {
    score += 45
    reasons.push("Cargo relacionado ao perfil")
  }

  if (job.remote) {
    score += 15
    reasons.push("Vaga remota")
  }

  score += 10
  reasons.push("Localização compatível")

  const searchableText = `${title} ${description}`

  const matchedSkills = [
    ...new Set(findMatches(searchableText, searchProfile.skills))
  ]

  // As competências ajudam no ranking, mas não devem transformar
  // uma vaga de outra área em uma boa oportunidade.
  score += Math.min(matchedSkills.length * 3, 30)

  if (matchedSkills.length > 0) {
    reasons.push(`${matchedSkills.length} competência(s) relacionada(s)`)
  }

  return {
    job,
    score: Math.min(score, 100),
    matchedSkills,
    reasons
  }
}