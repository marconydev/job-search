type DadosVaga = {
  title: string

  description: string

  location: string | null
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

  return normalizado.includes(` ${termoNormalizado} `)
}

/**
 * O projeto passa a priorizar títulos apresentados em português.
 *
 * Siglas e termos técnicos em inglês continuam permitidos quando fazem
 * parte de um título brasileiro, por exemplo:
 *
 * Analista de Service Desk
 * Analista NOC
 * Analista de Power BI
 *
 * Mas títulos totalmente em inglês deixam de ser considerados.
 */
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

function vagaEhHibrida(vaga: DadosVaga) {
  const localizacao = normalizarTexto(vaga.location ?? "")

  if (
    contemExpressao(localizacao, "hibrido") ||
    contemExpressao(localizacao, "hibrida") ||
    contemExpressao(localizacao, "hybrid")
  ) {
    return true
  }

  const contexto = normalizarTexto(`${vaga.title} ${vaga.description}`)

  const padroes = [
    "modelo hibrido",
    "modelo hibrida",
    "modalidade hibrida",
    "modalidade hibrido",
    "regime hibrido",
    "regime hibrida",
    "trabalho hibrido",
    "trabalho hibrida",
    "formato hibrido",
    "formato hibrida",
    "atuacao hibrida",
    "atuacao hibrido",
    "hybrid model",
    "hybrid work",
    "hybrid role",
    "work arrangement hybrid",
    "workplace type hybrid"
  ]

  return padroes.some(padrao => contexto.includes(padrao))
}

function vagaEstaNaParaiba(vaga: DadosVaga) {
  const localizacaoOriginal = vaga.location ?? ""

  /**
   * A sigla PB precisa permanecer maiúscula para não confundir
   * abreviações encontradas em outros textos.
   */
  if (/(^|[\s,;/|()\-–—])PB($|[\s,;/|()\-–—])/u.test(localizacaoOriginal)) {
    return true
  }

  const contexto = normalizarTexto(
    [vaga.location, vaga.title, vaga.description].filter(Boolean).join(" ")
  )

  const referenciasParaiba = [
    "paraiba",
    "joao pessoa",
    "campina grande",
    "cabedelo",
    "bayeux",
    "santa rita",
    "patos",
    "sousa",
    "cajazeiras",
    "guarabira"
  ]

  return referenciasParaiba.some(referencia => contemExpressao(contexto, referencia))
}

export function avaliarPoliticaVagaBrasil(vaga: DadosVaga) {
  if (!tituloEstaNoFocoBrasil(vaga.title)) {
    return {
      permitida: false,

      motivo: "Título da vaga fora do foco brasileiro em português."
    }
  }

  if (vagaEhHibrida(vaga) && !vagaEstaNaParaiba(vaga)) {
    return {
      permitida: false,

      motivo: "Vaga híbrida fora da Paraíba ou sem localização em PB confirmada."
    }
  }

  return {
    permitida: true,

    motivo: null
  }
}
