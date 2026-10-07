import { PENALIDADE_TITULO_FORA_FOCO } from "../config/matcher.js"

type DadosVaga = {
  title: string
  location: string | null
  remote: boolean
}

export type ResultadoPoliticaVaga = {
  permitida: boolean
  motivo: string | null
  /**
   * Pontos a descontar no score final.
   *
   * A política não veta mais por região geográfica (M3).
   * A única penalidade restante é o título fora do foco em português,
   * que agora desconta em vez de bloquear (M4).
   */
  desconto: number
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function contemExpressao(texto: string, termo: string) {
  const normalizado = ` ${normalizarTexto(texto)} `
  const termoNormalizado = normalizarTexto(termo)
  if (!termoNormalizado) return false
  return normalizado.includes(` ${termoNormalizado} `)
}

const MARCADORES_TITULO_BRASIL = [
  "analista",
  "suporte",
  "tecnico",
  "tecnica",
  "sistemas",
  "infraestrutura",
  "implantacao",
  "implementacao",
  "processos",
  "dados",
  "negocios",
  "redes",
  "monitoramento",
  "administrador",
  "administradora",
  "consultor",
  "consultora",
  "especialista",
  "coordenador",
  "coordenadora",
  "assistente",
  "atendimento",
  "operacoes",
  "operacao"
]

export function tituloEstaNoFocoBrasil(titulo: string) {
  return MARCADORES_TITULO_BRASIL.some(marcador => contemExpressao(titulo, marcador))
}

/**
 * Regra geográfica atual (M3):
 *
 * - A trava de João Pessoa/PB foi removida.
 * - Presenciais e híbridas em qualquer lugar do Brasil passam a ser permitidas
 *   pelo filtro geográfico. A adequação fina é feita pelo matcher/perfil.
 * - Títulos fora do foco em português não bloqueiam mais; apenas descontam.
 */
export function avaliarPoliticaVagaBrasil(vaga: DadosVaga): ResultadoPoliticaVaga {
  const noFoco = tituloEstaNoFocoBrasil(vaga.title)

  return {
    permitida: true,
    motivo: null,
    desconto: noFoco ? 0 : PENALIDADE_TITULO_FORA_FOCO
  }
}
