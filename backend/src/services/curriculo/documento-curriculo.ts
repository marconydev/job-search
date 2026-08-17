export type TipoSecao = "resumo" | "competencias" | "experiencias" | "formacoes" | "cursos"

export type LinhaDocumento = {
  ordem: number
  texto: string
  normalizado: string
  bullet: boolean
  secao: TipoSecao | null
}

export type SecoesDocumento = Record<TipoSecao, LinhaDocumento[]>

export type DocumentoCurriculo = {
  linhas: LinhaDocumento[]
  secoes: SecoesDocumento
}

export type ItemPontuado = {
  texto: string
  pontos: number
}

export type LinhaPontuada = {
  linha: LinhaDocumento
  pontos: number
}

export const TERMOS_INSTITUICAO = [
  "universidade",
  "university",
  "faculdade",
  "college",
  "centro universitario",
  "instituto",
  "institute",
  "escola",
  "school",
  "academia",
  "academy",
  "fundacao",
  "foundation",
  "senac",
  "senai",
  "ifpb",
  "ifpe",
  "ifrn",
  "ufpb",
  "ufpe",
  "ufrn",
  "unipe",
  "unip",
  "estacio",
  "anhanguera",
  "cruzeiro do sul",
  "puc"
]

const TITULOS_SECOES: Record<TipoSecao, string[]> = {
  resumo: [
    "perfil profissional",
    "resumo profissional",
    "resumo",
    "sobre mim",
    "objetivo profissional",
    "perfil",
    "professional summary",
    "professional profile",
    "summary",
    "profile",
    "about me",
    "career objective"
  ],

  competencias: [
    "principais competencias",
    "competencias",
    "competencias profissionais",
    "competencias tecnicas",
    "habilidades",
    "conhecimentos",
    "tecnologias e ferramentas",
    "tecnologias",
    "ferramentas",
    "skills",
    "technical skills",
    "core skills",
    "technologies",
    "tools"
  ],

  experiencias: [
    "experiencia profissional",
    "experiencias profissionais",
    "historico profissional",
    "trajetoria profissional",
    "carreira profissional",
    "experiencia",
    "experiencias",
    "professional experience",
    "work experience",
    "employment history",
    "career history",
    "experience"
  ],

  formacoes: [
    "formacao academica",
    "formacoes academicas",
    "formacao",
    "educacao",
    "escolaridade",
    "academic background",
    "academic education",
    "education",
    "educational background"
  ],

  cursos: [
    "cursos complementares",
    "cursos e certificacoes",
    "certificacoes",
    "qualificacoes",
    "treinamentos",
    "cursos",
    "courses",
    "certifications",
    "courses and certifications",
    "training",
    "professional development"
  ]
}

const PADRAO_MES =
  "(?:jan(?:eiro|uary)?|fev(?:ereiro)?|feb(?:ruary)?|mar(?:co|ch)?|abr(?:il)?|apr(?:il)?|mai(?:o)?|may|jun(?:ho|e)?|jul(?:ho|y)?|ago(?:sto)?|aug(?:ust)?|set(?:embro)?|sep(?:tember)?|out(?:ubro)?|oct(?:ober)?|nov(?:embro|ember)?|dez(?:embro)?|dec(?:ember)?)"

const PADRAO_ANO = "(?:19|20)\\d{2}"

const PADRAO_DATA =
  `(?:${PADRAO_MES}\\.?\\s*(?:de\\s*)?[\\/.\\-]?\\s*${PADRAO_ANO}` +
  `|(?:0?[1-9]|1[0-2])[\\/.\\-]${PADRAO_ANO}` +
  `|${PADRAO_ANO})`

const PADRAO_DATA_FINAL = `(?:${PADRAO_DATA}|atual|presente|present|current|hoje|momento)`

const REGEX_INTERVALO = new RegExp(
  `${PADRAO_DATA}\\s*(?:-|–|—|a|ate|to)\\s*${PADRAO_DATA_FINAL}`,
  "i"
)

const REGEX_DATA = new RegExp(PADRAO_DATA, "i")

export function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizarData(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

export function contemTermo(texto: string, termo: string) {
  const textoNormalizado = ` ${normalizarTexto(texto)} `
  const termoNormalizado = normalizarTexto(termo)

  if (!termoNormalizado) {
    return false
  }

  return textoNormalizado.includes(` ${termoNormalizado} `)
}

export function contemAlgumTermo(texto: string, termos: string[]) {
  return termos.some(termo => contemTermo(texto, termo))
}

function detectarBullet(texto: string) {
  return /^\s*(?:•|●|▪|■|◦|\*|ÔÇó)\s*/i.test(texto)
}

function limparLinha(texto: string) {
  return texto
    .replace(/^\s*(?:•|●|▪|■|◦|\*|ÔÇó)\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

function ehRodapePagina(texto: string) {
  const normalizado = normalizarTexto(texto)

  return (
    /^\d+\s+of\s+\d+$/.test(normalizado) ||
    /^\d+\s+de\s+\d+$/.test(normalizado) ||
    /^page\s+\d+(?:\s+of\s+\d+)?$/.test(normalizado)
  )
}

export function ehContato(texto: string) {
  const normalizado = normalizarTexto(texto)

  return (
    texto.includes("@") ||
    normalizado.includes("linkedin com") ||
    normalizado.includes("github com") ||
    normalizado.includes("http") ||
    /\(\d{2}\)\s*\d/.test(texto) ||
    /\b\d{4,5}[-\s]\d{4}\b/.test(texto)
  )
}

export function pareceFraseDescritiva(texto: string) {
  const palavras = texto.split(/\s+/).filter(Boolean)

  return palavras.length > 14 || /[.!?]$/.test(texto.trim())
}

function identificarSecao(texto: string): TipoSecao | null {
  const normalizado = normalizarTexto(texto)

  if (!normalizado || normalizado.length > 80) {
    return null
  }

  const tipos = Object.keys(TITULOS_SECOES) as TipoSecao[]

  for (const tipo of tipos) {
    const termos = TITULOS_SECOES[tipo]

    const encontrou = termos.some(termo => normalizado === normalizarTexto(termo))

    if (encontrou) {
      return tipo
    }
  }

  return null
}

function criarSecoesVazias(): SecoesDocumento {
  return {
    resumo: [],
    competencias: [],
    experiencias: [],
    formacoes: [],
    cursos: []
  }
}

export function prepararDocumento(texto: string): DocumentoCurriculo {
  const secoes = criarSecoesVazias()
  const linhas: LinhaDocumento[] = []

  let secaoAtual: TipoSecao | null = null
  let ordem = 0

  for (const original of texto.split(/\r?\n/)) {
    const bullet = detectarBullet(original)
    const limpo = limparLinha(original)

    if (!limpo || ehRodapePagina(limpo)) {
      continue
    }

    const secao = identificarSecao(limpo)

    if (secao) {
      secaoAtual = secao
      continue
    }

    const linha: LinhaDocumento = {
      ordem,
      texto: limpo,
      normalizado: normalizarTexto(limpo),
      bullet,
      secao: secaoAtual
    }

    linhas.push(linha)

    if (secaoAtual) {
      secoes[secaoAtual].push(linha)
    }

    ordem++
  }

  return {
    linhas,
    secoes
  }
}

export function extrairPeriodo(texto: string) {
  const normalizado = normalizarData(texto)

  const intervalo = normalizado.match(REGEX_INTERVALO)

  if (intervalo?.[0]) {
    return intervalo[0]
  }

  const data = normalizado.match(REGEX_DATA)

  if (!data?.[0]) {
    return ""
  }

  if (/\b(atual|presente|present|current|hoje|momento)\b/i.test(normalizado)) {
    return normalizado
  }

  return data[0]
}

export function possuiPeriodo(texto: string) {
  return Boolean(extrairPeriodo(texto))
}

export function pareceSomentePeriodo(texto: string) {
  if (!possuiPeriodo(texto)) {
    return false
  }

  const palavras = texto.split(/\s+/).filter(Boolean)

  return palavras.length <= 10
}

export function dividirCamposFortes(texto: string) {
  const porSeparadores = texto
    .split(/\s*(?:\||•|●|▪|·|\t)\s*|\s+[–—]\s+/u)
    .map(item => item.trim())
    .filter(Boolean)

  if (porSeparadores.length > 1) {
    return porSeparadores
  }

  return [texto.trim()]
}
