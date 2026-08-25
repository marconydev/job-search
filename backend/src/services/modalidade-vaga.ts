export type ModalidadeEstruturada = "remote" | "hybrid" | "on-site" | "unknown"

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Converte apenas informações estruturadas da própria fonte.
 *
 * Não utilizo descrição, requisitos ou responsabilidades para determinar
 * modalidade porque frases como:
 *
 * - suporte remoto;
 * - atendimento remoto;
 * - acesso remoto;
 * - atendimento remoto e presencial;
 *
 * descrevem atividades e não necessariamente o regime de trabalho.
 */
export function interpretarModalidadeEstruturada(valor: unknown): ModalidadeEstruturada {
  if (typeof valor !== "string") {
    return "unknown"
  }

  const modalidade = normalizarTexto(valor)

  if (!modalidade) {
    return "unknown"
  }

  if (
    ["remote", "remoto", "remota", "telecommute", "fully remote", "remote work"].includes(
      modalidade
    )
  ) {
    return "remote"
  }

  if (["hybrid", "hibrido", "hibrida"].includes(modalidade)) {
    return "hybrid"
  }

  if (["on site", "onsite", "presencial"].includes(modalidade)) {
    return "on-site"
  }

  return "unknown"
}

/**
 * Um campo estruturado moderno sempre tem prioridade sobre indicadores
 * legados.
 *
 * Exemplo:
 *
 * workplaceType = "on-site"
 * isRemoteWork = true
 *
 * Resultado:
 *
 * false
 *
 * Isso impede um campo legado inconsistente de transformar uma vaga
 * presencial em remota.
 */
export function trabalhoEhRemotoPorFonteEstruturada(
  modalidade: unknown,
  indicadorLegado?: unknown
) {
  const valorOriginal = typeof modalidade === "string" ? modalidade.trim() : ""

  if (valorOriginal) {
    return interpretarModalidadeEstruturada(valorOriginal) === "remote"
  }

  if (typeof indicadorLegado === "boolean") {
    return indicadorLegado
  }

  return false
}
