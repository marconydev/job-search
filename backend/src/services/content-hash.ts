import { createHash } from "node:crypto"

/**
 * Normalizo o texto antes de hashear.
 *
 * A ideia é que pequenas variações cosméticas entre coletas — quebra de
 * linha, espaços duplicados, tags HTML a mais, entidades — não gerem um
 * hash diferente. Sem isso, a comparação de hash vira uma checagem byte
 * a byte que não ajuda em nada.
 *
 * Não normalizo acentos nem caixa para não perder sinal real (uma mudança
 * de "Júnior" para "Junior" pode indicar reedição de vaga).
 */
function normalizarTexto(valor: string | null | undefined): string {
  if (!valor) return ""

  return valor
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Hash determinístico do conteúdo que importa para o matching.
 *
 * Campos cobertos: title, company, location, description, remote.
 *
 * Não incluo url, publishedAt nem source_key porque não afetam score.
 */
export function calcularContentHash(job: {
  title: string
  company: string
  location: string | null
  description: string
  remote: boolean
}): string {
  const partes = [
    normalizarTexto(job.title),
    normalizarTexto(job.company),
    normalizarTexto(job.location),
    normalizarTexto(job.description),
    job.remote ? "1" : "0"
  ]

  return createHash("sha256").update(partes.join("\u0000")).digest("hex")
}
