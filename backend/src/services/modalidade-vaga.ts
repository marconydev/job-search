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

export function interpretarModalidadeEstruturada(valor: unknown): ModalidadeEstruturada {
  if (typeof valor !== "string") return "unknown"
  const modalidade = normalizarTexto(valor)
  if (!modalidade) return "unknown"

  if (
    [
      "remote",
      "remoto",
      "remota",
      "telecommute",
      "fully remote",
      "remote work",
      "remote local",
      "remote global"
    ].includes(modalidade)
  ) {
    return "remote"
  }

  if (["hybrid", "hibrido", "hibrida"].includes(modalidade)) return "hybrid"
  if (["on site", "onsite", "presencial"].includes(modalidade)) return "on-site"

  return "unknown"
}

export function trabalhoEhRemotoPorFonteEstruturada(
  modalidade: unknown,
  indicadorLegado?: unknown
) {
  const valorOriginal = typeof modalidade === "string" ? modalidade.trim() : ""
  if (valorOriginal) {
    return interpretarModalidadeEstruturada(valorOriginal) === "remote"
  }
  if (typeof indicadorLegado === "boolean") return indicadorLegado
  return false
}
