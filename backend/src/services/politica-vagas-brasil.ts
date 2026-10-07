import { PENALIDADE_TITULO_FORA_FOCO } from "../config/matcher.js"

import type { WorkplaceType } from "../types/job.js"

type DadosVaga = {
  title: string

  location: string | null

  remote: boolean

  workplaceType?: WorkplaceType | null
}

export type ResultadoPoliticaVaga = {
  permitida: boolean

  motivo: string | null

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
  "supervisor",
  "supervisora",
  "assistente",
  "atendimento",
  "operacoes",
  "operacao",
  "service desk",
  "help desk",
  "noc"
]

export function tituloEstaNoFocoBrasil(titulo: string) {
  return MARCADORES_TITULO_BRASIL.some(marcador => contemExpressao(titulo, marcador))
}

/**
 * Decide a modalidade efetiva da vaga.
 *
 * - "on-site"   → presencial.
 * - "hybrid"    → híbrida.
 * - "remote"    → remota.
 * - "unknown"   → cai de volta para o booleano `remote`.
 *
 * A modalidade estruturada sempre vence quando a fonte a informou.
 */
function modalidadeEfetiva(vaga: DadosVaga): WorkplaceType {
  if (vaga.workplaceType === "on-site") return "on-site"
  if (vaga.workplaceType === "hybrid") return "hybrid"
  if (vaga.workplaceType === "remote") return "remote"

  return vaga.remote ? "remote" : "unknown"
}

export function vagaEstaEmJoaoPessoa(vaga: Pick<DadosVaga, "location">) {
  const local = vaga.location ?? ""

  return (
    contemExpressao(local, "joao pessoa") ||
    contemExpressao(local, "campina grande") ||
    contemExpressao(local, "paraiba")
  )
}

/**
 * Regra geográfica pós-M3:
 *
 * - PRESENCIAL: restrito a João Pessoa/PB e arredores.
 * - HÍBRIDA: aceito em qualquer lugar do Brasil.
 * - REMOTA: aceito no Brasil.
 * - DESCONHECIDA: mantida para análise (a elegibilidade já filtrou o
 *   exterior). Não é penalizada.
 *
 * Título fora do foco em português continua descontando 15 pontos (M4).
 */
export function avaliarPoliticaVagaBrasil(vaga: DadosVaga): ResultadoPoliticaVaga {
  const noFoco = tituloEstaNoFocoBrasil(vaga.title)

  const desconto = noFoco ? 0 : PENALIDADE_TITULO_FORA_FOCO

  const modalidade = modalidadeEfetiva(vaga)

  if (modalidade === "on-site" && !vagaEstaEmJoaoPessoa(vaga)) {
    return {
      permitida: false,

      motivo: "Vaga presencial fora de João Pessoa/PB.",

      desconto
    }
  }

  return {
    permitida: true,

    motivo: null,

    desconto
  }
}
