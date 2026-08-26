import type { UserJobStatus } from "../types/job.js"

const STATUS_MANUAIS = new Set<UserJobStatus>(["relevant", "applied", "ignored"])

/**
 * Valido somente decisões que realmente alteram o estado operacional
 * da oportunidade.
 *
 * Visualização é um evento separado e deve ser registrada em viewed_at.
 */
export function isUserJobStatus(value: unknown): value is UserJobStatus {
  return typeof value === "string" && STATUS_MANUAIS.has(value as UserJobStatus)
}
