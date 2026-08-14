import type {
  CursoProfissional,
  ExperienciaProfissional,
  FormacaoProfissional,
  PerfilProfissional
} from "../types/perfil-profissional.js"

import type { ResultadoImportacaoCurriculo } from "../types/importacao-curriculo.js"

/**
 * Tipos internos
 */

type TipoSecao = "resumo" | "competencias" | "experiencias" | "formacoes" | "cursos"

type LinhaDocumento = {
  ordem: number
  texto: string
  normalizado: string
  bullet: boolean
  secao: TipoSecao | null
}

type SecoesDocumento = Record<TipoSecao, LinhaDocumento[]>

type DocumentoCurriculo = {
  linhas: LinhaDocumento[]
  secoes: SecoesDocumento
}

type CandidatoExperiencia = {
  inicio: number
  fimCabecalho: number
  cargo: string
  empresa: string
  periodo: string
  confianca: number
}

type CandidatoFormacao = {
  inicio: number
  fimCabecalho: number
  curso: string
  instituicao: string
  nivel: string
  periodo: string
  confianca: number
}

type ItemPontuado = {
  texto: string
  pontos: number
}

type LinhaPontuada = {
  linha: LinhaDocumento
  pontos: number
}

/**
 * Títulos que costumo encontrar em currículos em português e inglês.
 *
 * Eu não dependo do título existir, mas quando ele existe consigo
 * aumentar bastante a confiança da interpretação.
 */
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

const NIVEIS_FORMACAO: Array<{
  nome: string
  termos: string[]
}> = [
  {
    nome: "Pós-doutorado",
    termos: ["pos doutorado", "postdoctoral", "post doctorate"]
  },
  {
    nome: "Doutorado",
    termos: ["doutorado", "doctorate", "phd", "ph d"]
  },
  {
    nome: "Mestrado",
    termos: ["mestrado", "master", "masters degree"]
  },
  {
    nome: "MBA",
    termos: ["mba"]
  },
  {
    nome: "Pós-graduação",
    termos: ["pos graduacao", "pos graduado", "postgraduate", "post graduation"]
  },
  {
    nome: "Especialização",
    termos: ["especializacao", "specialization", "specialisation"]
  },
  {
    nome: "Tecnólogo",
    termos: ["tecnologo", "technologist", "technology degree"]
  },
  {
    nome: "Bacharelado",
    termos: ["bacharelado", "bacharel", "bachelor", "bachelors degree"]
  },
  {
    nome: "Licenciatura",
    termos: ["licenciatura"]
  },
  {
    nome: "Graduação",
    termos: ["graduacao", "ensino superior", "superior completo", "undergraduate", "degree"]
  },
  {
    nome: "Técnico",
    termos: ["curso tecnico", "tecnico", "technical course"]
  },
  {
    nome: "Ensino Médio",
    termos: ["ensino medio", "high school"]
  }
]

const TERMOS_CARGO = [
  "analista",
  "analyst",
  "coordenador",
  "coordenadora",
  "coordinator",
  "gerente",
  "manager",
  "especialista",
  "specialist",
  "assistente",
  "assistant",
  "tecnico",
  "technician",
  "suporte",
  "support",
  "administrador",
  "administrator",
  "engenheiro",
  "engineer",
  "desenvolvedor",
  "developer",
  "programador",
  "programmer",
  "consultor",
  "consultant",
  "arquiteto",
  "architect",
  "supervisor",
  "lider",
  "lead",
  "head",
  "estagiario",
  "intern",
  "infraestrutura",
  "infrastructure",
  "redes",
  "network",
  "sistemas",
  "systems",
  "dados",
  "data",
  "service desk",
  "help desk",
  "helpdesk",
  "customer success",
  "noc"
]

const TERMOS_INSTITUICAO = [
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

const TERMOS_EMPRESA = [
  "ltda",
  "s a",
  "inc",
  "corp",
  "corporation",
  "company",
  "empresa",
  "grupo",
  "group",
  "hospital",
  "clinica",
  "clinic",
  "banco",
  "bank",
  "telecom",
  "tecnologia",
  "technology",
  "solutions",
  "solucoes",
  "servicos",
  "services"
]

const TERMOS_ACADEMICOS = [
  "analise e desenvolvimento de sistemas",
  "sistemas de informacao",
  "ciencia da computacao",
  "engenharia de software",
  "engenharia da computacao",
  "tecnologia da informacao",
  "gestao da tecnologia da informacao",
  "redes de computadores",
  "banco de dados",
  "administracao",
  "engenharia",
  "direito",
  "contabilidade",
  "enfermagem",
  "medicina",
  "psicologia",
  "pedagogia",
  "computer science",
  "information systems",
  "software engineering",
  "computer engineering",
  "information technology"
]

/**
 * Datas
 */

const PADRAO_MES =
  "(?:jan(?:eiro|uary)?|fev(?:ereiro)?|feb(?:ruary)?|mar(?:co|ch)?|abr(?:il)?|apr(?:il)?|mai(?:o)?|may|jun(?:ho|e)?|jul(?:ho|y)?|ago(?:sto)?|aug(?:ust)?|set(?:embro)?|sep(?:tember)?|out(?:ubro)?|oct(?:ober)?|nov(?:embro|ember)?|dez(?:embro)?|dec(?:ember)?)"

const PADRAO_ANO = "(?:19|20)\\d{2}"

const PADRAO_DATA = `(?:${PADRAO_MES}\\.?\\s*(?:de\\s*)?[\\/.\\-]?\\s*${PADRAO_ANO}|(?:0?[1-9]|1[0-2])[\\/.\\-]${PADRAO_ANO}|${PADRAO_ANO})`

const PADRAO_DATA_FINAL = `(?:${PADRAO_DATA}|atual|presente|present|current|hoje|momento)`

const REGEX_INTERVALO = new RegExp(
  `${PADRAO_DATA}\\s*(?:-|–|—|a|ate|to)\\s*${PADRAO_DATA_FINAL}`,
  "i"
)

const REGEX_DATA = new RegExp(PADRAO_DATA, "i")

/**
 * Normalização
 */

function normalizarTexto(valor: string) {
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

function contemTermo(texto: string, termo: string) {
  const textoNormalizado = ` ${normalizarTexto(texto)} `

  const termoNormalizado = normalizarTexto(termo)

  if (!termoNormalizado) {
    return false
  }

  return textoNormalizado.includes(` ${termoNormalizado} `)
}

function contemAlgumTermo(texto: string, termos: string[]) {
  return termos.some(termo => contemTermo(texto, termo))
}

/**
 * Limpeza do documento
 */

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

function ehContato(texto: string) {
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

function pareceFraseDescritiva(texto: string) {
  const palavras = texto.split(/\s+/).filter(Boolean)

  return palavras.length > 14 || /[.!?]$/.test(texto.trim())
}

/**
 * Seções
 */

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

function prepararDocumento(texto: string): DocumentoCurriculo {
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

/**
 * Datas e períodos
 */

function extrairPeriodo(texto: string) {
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

function possuiPeriodo(texto: string) {
  return Boolean(extrairPeriodo(texto))
}

function pareceSomentePeriodo(texto: string) {
  if (!possuiPeriodo(texto)) {
    return false
  }

  const palavras = texto.split(/\s+/).filter(Boolean)

  return palavras.length <= 10
}

/**
 * Separação de cabeçalhos
 */

function dividirCamposFortes(texto: string) {
  const porSeparadores = texto
    .split(/\s*(?:\||•|●|▪|·|\t)\s*|\s+[–—]\s+/u)
    .map(item => item.trim())
    .filter(Boolean)

  if (porSeparadores.length > 1) {
    return porSeparadores
  }

  return [texto.trim()]
}

/**
 * Pontuação de cargo
 */

function pontuarCargo(texto: string, perfil: PerfilProfissional) {
  if (!texto || ehContato(texto) || pareceSomentePeriodo(texto)) {
    return -20
  }

  let pontos = 0

  const cargosPerfil = [
    ...perfil.cargosPrincipais,
    ...perfil.cargosRelacionados,
    ...perfil.experiencias.map(experiencia => experiencia.cargo)
  ]
    .map(cargo => cargo.trim())
    .filter(Boolean)

  if (contemAlgumTermo(texto, cargosPerfil)) {
    pontos += 8
  }

  if (contemAlgumTermo(texto, TERMOS_CARGO)) {
    pontos += 5
  }

  const quantidadePalavras = texto.split(/\s+/).filter(Boolean).length

  if (quantidadePalavras >= 1 && quantidadePalavras <= 10) {
    pontos += 2
  }

  if (contemAlgumTermo(texto, TERMOS_INSTITUICAO)) {
    pontos -= 5
  }

  if (pareceFraseDescritiva(texto)) {
    pontos -= 5
  }

  return pontos
}

/**
 * Pontuação de empresa
 */

function pontuarEmpresa(texto: string, perfil: PerfilProfissional) {
  if (!texto || ehContato(texto) || pareceSomentePeriodo(texto)) {
    return -20
  }

  let pontos = 0

  const quantidadePalavras = texto.split(/\s+/).filter(Boolean).length

  if (quantidadePalavras >= 1 && quantidadePalavras <= 12) {
    pontos += 3
  }

  if (contemAlgumTermo(texto, TERMOS_EMPRESA)) {
    pontos += 4
  }

  if (pontuarCargo(texto, perfil) >= 6) {
    pontos -= 6
  }

  if (pareceFraseDescritiva(texto)) {
    pontos -= 5
  }

  return pontos
}

/**
 * Pontuação acadêmica
 */

function identificarNivel(texto: string) {
  for (const nivel of NIVEIS_FORMACAO) {
    if (contemAlgumTermo(texto, nivel.termos)) {
      return nivel.nome
    }
  }

  return ""
}

function pontuarInstituicao(texto: string) {
  if (!texto || ehContato(texto) || pareceSomentePeriodo(texto)) {
    return -20
  }

  let pontos = 0

  if (contemAlgumTermo(texto, TERMOS_INSTITUICAO)) {
    pontos += 8
  }

  const palavras = texto.split(/\s+/).filter(Boolean)

  if (palavras.length <= 12) {
    pontos += 2
  }

  if (pareceFraseDescritiva(texto)) {
    pontos -= 5
  }

  return pontos
}

function pontuarCursoAcademico(texto: string) {
  if (!texto || ehContato(texto) || pareceSomentePeriodo(texto)) {
    return -20
  }

  let pontos = 0

  if (identificarNivel(texto)) {
    pontos += 7
  }

  if (contemAlgumTermo(texto, TERMOS_ACADEMICOS)) {
    pontos += 6
  }

  if (pontuarInstituicao(texto) >= 7) {
    pontos -= 6
  }

  if (pareceFraseDescritiva(texto)) {
    pontos -= 4
  }

  return pontos
}

/**
 * Competências
 *
 * Eu procuro competências no documento completo, portanto essa etapa
 * não depende da posição nem da existência da seção "Competências".
 */
function encontrarCompetencias(texto: string, perfil: PerfilProfissional) {
  return perfil.competencias
    .filter(competencia => {
      const termos = [competencia.nome, ...competencia.termos]

      return termos.some(termo => contemTermo(texto, termo))
    })
    .map(competencia => ({
      nome: competencia.nome,

      termos: [...competencia.termos]
    }))
}

/**
 * EXPERIÊNCIAS
 */

function analisarExperienciaUmaLinha(
  linha: LinhaDocumento,
  perfil: PerfilProfissional
): CandidatoExperiencia | null {
  if (!possuiPeriodo(linha.texto)) {
    return null
  }

  const campos = dividirCamposFortes(linha.texto)

  if (campos.length < 2) {
    return null
  }

  const camposPeriodo = campos.filter(campo => possuiPeriodo(campo))

  const camposTexto = campos.filter(campo => !possuiPeriodo(campo))

  if (camposTexto.length === 0) {
    return null
  }

  const cargos: ItemPontuado[] = camposTexto
    .map(texto => ({
      texto,
      pontos: pontuarCargo(texto, perfil)
    }))
    .sort((a, b) => b.pontos - a.pontos)

  const melhorCargo = cargos[0]

  if (!melhorCargo || melhorCargo.pontos < 3) {
    return null
  }

  const empresas: ItemPontuado[] = camposTexto
    .filter(texto => texto !== melhorCargo.texto)
    .map(texto => ({
      texto,
      pontos: pontuarEmpresa(texto, perfil)
    }))
    .sort((a, b) => b.pontos - a.pontos)

  const melhorEmpresa = empresas[0]

  const periodo = camposPeriodo.length > 0 ? camposPeriodo.join(" - ") : extrairPeriodo(linha.texto)

  return {
    inicio: linha.ordem,

    fimCabecalho: linha.ordem,

    cargo: melhorCargo.texto,

    empresa: melhorEmpresa && melhorEmpresa.pontos >= 0 ? melhorEmpresa.texto : "",

    periodo,

    confianca:
      melhorCargo.pontos +
      Math.max(melhorEmpresa?.pontos ?? 0, 0) +
      (linha.secao === "experiencias" ? 4 : 0)
  }
}

function analisarExperienciaMultilinha(
  linhas: LinhaDocumento[],
  posicaoData: number,
  perfil: PerfilProfissional,
  secaoConfiavel: boolean
): CandidatoExperiencia | null {
  const linhaData = linhas[posicaoData]

  if (!linhaData || !possuiPeriodo(linhaData.texto)) {
    return null
  }

  const inicioJanela = Math.max(0, posicaoData - 3)

  const fimJanela = Math.min(linhas.length - 1, posicaoData + 3)

  const contexto = linhas
    .slice(inicioJanela, fimJanela + 1)
    .filter(
      linha =>
        linha.ordem !== linhaData.ordem &&
        !linha.bullet &&
        !possuiPeriodo(linha.texto) &&
        !ehContato(linha.texto)
    )

  const cargos: LinhaPontuada[] = contexto
    .map(linha => ({
      linha,
      pontos: pontuarCargo(linha.texto, perfil)
    }))
    .sort((a, b) => b.pontos - a.pontos)

  const melhorCargo = cargos[0]

  const minimoCargo = secaoConfiavel ? 2 : 6

  if (!melhorCargo || melhorCargo.pontos < minimoCargo) {
    return null
  }

  const empresas: LinhaPontuada[] = contexto
    .filter(linha => linha.ordem !== melhorCargo.linha.ordem)
    .map(linha => ({
      linha,
      pontos: pontuarEmpresa(linha.texto, perfil)
    }))
    .sort((a, b) => b.pontos - a.pontos)

  const melhorEmpresa = empresas[0]

  const ordensCabecalho = [linhaData.ordem, melhorCargo.linha.ordem]

  if (melhorEmpresa && melhorEmpresa.pontos >= 0) {
    ordensCabecalho.push(melhorEmpresa.linha.ordem)
  }

  return {
    inicio: Math.min(...ordensCabecalho),

    fimCabecalho: Math.max(...ordensCabecalho),

    cargo: melhorCargo.linha.texto,

    empresa: melhorEmpresa && melhorEmpresa.pontos >= 0 ? melhorEmpresa.linha.texto : "",

    periodo: linhaData.texto,

    confianca:
      melhorCargo.pontos + Math.max(melhorEmpresa?.pontos ?? 0, 0) + (secaoConfiavel ? 4 : 0)
  }
}

function deduplicarExperiencias(candidatos: CandidatoExperiencia[]) {
  const resultado: CandidatoExperiencia[] = []

  const ordenados = [...candidatos].sort((a, b) => a.inicio - b.inicio || b.confianca - a.confianca)

  for (const candidato of ordenados) {
    const duplicado = resultado.some(existente => {
      const mesmoCargo = normalizarTexto(existente.cargo) === normalizarTexto(candidato.cargo)

      const mesmoPeriodo = normalizarTexto(existente.periodo) === normalizarTexto(candidato.periodo)

      const mesmaRegiao = Math.abs(existente.inicio - candidato.inicio) <= 1

      return (mesmoCargo && mesmoPeriodo) || (mesmoPeriodo && mesmaRegiao)
    })

    if (!duplicado) {
      resultado.push(candidato)
    }
  }

  return resultado
}

function extrairExperiencias(
  documento: DocumentoCurriculo,
  perfil: PerfilProfissional
): ExperienciaProfissional[] {
  const secaoExplicita = documento.secoes.experiencias.length > 0

  const linhas = secaoExplicita ? documento.secoes.experiencias : documento.linhas

  const candidatos: CandidatoExperiencia[] = []

  for (let posicao = 0; posicao < linhas.length; posicao++) {
    const linha = linhas[posicao]

    if (!linha) {
      continue
    }

    const umaLinha = analisarExperienciaUmaLinha(linha, perfil)

    if (umaLinha && umaLinha.confianca >= (secaoExplicita ? 6 : 10)) {
      candidatos.push(umaLinha)

      continue
    }

    if (!possuiPeriodo(linha.texto)) {
      continue
    }

    const multilinha = analisarExperienciaMultilinha(linhas, posicao, perfil, secaoExplicita)

    if (multilinha && multilinha.confianca >= (secaoExplicita ? 6 : 11)) {
      candidatos.push(multilinha)
    }
  }

  const unicos = deduplicarExperiencias(candidatos)

  return unicos
    .map((candidato, indice): ExperienciaProfissional => {
      const proximo = unicos[indice + 1]

      const limite = proximo ? proximo.inicio : Number.POSITIVE_INFINITY

      const descricao = linhas
        .filter(linha => linha.ordem > candidato.fimCabecalho && linha.ordem < limite)
        .filter(linha => !possuiPeriodo(linha.texto))
        .filter(linha => linha.texto !== candidato.cargo && linha.texto !== candidato.empresa)
        .map(linha => linha.texto)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()

      return {
        empresa: candidato.empresa,

        cargo: candidato.cargo,

        periodo: candidato.periodo,

        descricao
      }
    })
    .filter(experiencia => Boolean(experiencia.cargo))
    .slice(0, 20)
}

/**
 * FORMAÇÃO
 */

function expandirCampoAcademico(campos: string[]) {
  if (campos.length !== 1) {
    return campos
  }

  const campo = campos[0]

  if (!campo) {
    return campos
  }

  const indice = campo.lastIndexOf(" - ")

  if (indice <= 0) {
    return campos
  }

  const esquerda = campo.slice(0, indice).trim()

  const direita = campo.slice(indice + 3).trim()

  if (!esquerda || !direita) {
    return campos
  }

  return [esquerda, direita]
}

function analisarFormacaoUmaLinha(
  linha: LinhaDocumento,
  secaoConfiavel: boolean
): CandidatoFormacao | null {
  if (!possuiPeriodo(linha.texto)) {
    return null
  }

  const campos = dividirCamposFortes(linha.texto)

  const camposPeriodo = campos.filter(campo => possuiPeriodo(campo))

  let camposTexto = campos.filter(campo => !possuiPeriodo(campo))

  camposTexto = expandirCampoAcademico(camposTexto)

  if (camposTexto.length === 0) {
    return null
  }

  const cursos: ItemPontuado[] = camposTexto
    .map(texto => ({
      texto,
      pontos: pontuarCursoAcademico(texto)
    }))
    .sort((a, b) => b.pontos - a.pontos)

  const melhorCurso = cursos[0]

  if (!melhorCurso) {
    return null
  }

  const minimoCurso = secaoConfiavel ? 1 : 5

  if (melhorCurso.pontos < minimoCurso) {
    return null
  }

  const instituicoes: ItemPontuado[] = camposTexto
    .filter(texto => texto !== melhorCurso.texto)
    .map(texto => ({
      texto,
      pontos: pontuarInstituicao(texto)
    }))
    .sort((a, b) => b.pontos - a.pontos)

  const melhorInstituicao = instituicoes[0]

  const periodo = camposPeriodo.length > 0 ? camposPeriodo.join(" - ") : extrairPeriodo(linha.texto)

  return {
    inicio: linha.ordem,

    fimCabecalho: linha.ordem,

    curso: melhorCurso.texto,

    instituicao: melhorInstituicao && melhorInstituicao.pontos >= 1 ? melhorInstituicao.texto : "",

    nivel: identificarNivel(camposTexto.join(" ")),

    periodo,

    confianca:
      melhorCurso.pontos + Math.max(melhorInstituicao?.pontos ?? 0, 0) + (secaoConfiavel ? 4 : 0)
  }
}

function analisarFormacaoMultilinha(
  linhas: LinhaDocumento[],
  posicaoData: number,
  secaoConfiavel: boolean
): CandidatoFormacao | null {
  const linhaData = linhas[posicaoData]

  if (!linhaData || !possuiPeriodo(linhaData.texto)) {
    return null
  }

  const inicioJanela = Math.max(0, posicaoData - 3)

  const fimJanela = Math.min(linhas.length - 1, posicaoData + 3)

  const contexto = linhas
    .slice(inicioJanela, fimJanela + 1)
    .filter(
      linha =>
        linha.ordem !== linhaData.ordem &&
        !linha.bullet &&
        !possuiPeriodo(linha.texto) &&
        !ehContato(linha.texto)
    )

  const cursos: LinhaPontuada[] = contexto
    .map(linha => ({
      linha,
      pontos: pontuarCursoAcademico(linha.texto)
    }))
    .sort((a, b) => b.pontos - a.pontos)

  const melhorCurso = cursos[0]

  if (!melhorCurso) {
    return null
  }

  const minimoCurso = secaoConfiavel ? 1 : 5

  if (melhorCurso.pontos < minimoCurso) {
    return null
  }

  const instituicoes: LinhaPontuada[] = contexto
    .filter(linha => linha.ordem !== melhorCurso.linha.ordem)
    .map(linha => ({
      linha,
      pontos: pontuarInstituicao(linha.texto)
    }))
    .sort((a, b) => b.pontos - a.pontos)

  const melhorInstituicao: LinhaPontuada | undefined = instituicoes.find(item => item.pontos >= 3)

  const ordens = [linhaData.ordem, melhorCurso.linha.ordem]

  if (melhorInstituicao) {
    ordens.push(melhorInstituicao.linha.ordem)
  }

  const textoNivel = contexto.map(linha => linha.texto).join(" ")

  return {
    inicio: Math.min(...ordens),

    fimCabecalho: Math.max(...ordens),

    curso: melhorCurso.linha.texto,

    instituicao: melhorInstituicao?.linha.texto ?? "",

    nivel: identificarNivel(textoNivel),

    periodo: linhaData.texto,

    confianca:
      melhorCurso.pontos + Math.max(melhorInstituicao?.pontos ?? 0, 0) + (secaoConfiavel ? 4 : 0)
  }
}

function extrairFormacoesSemPeriodo(linhas: LinhaDocumento[]) {
  const candidatos: CandidatoFormacao[] = []

  for (let indice = 0; indice < linhas.length; indice++) {
    const linha = linhas[indice]

    if (!linha) {
      continue
    }

    const pontosCurso = pontuarCursoAcademico(linha.texto)

    if (pontosCurso < 2) {
      continue
    }

    const vizinhas = [
      linhas[indice - 2],
      linhas[indice - 1],
      linhas[indice + 1],
      linhas[indice + 2]
    ].filter((item): item is LinhaDocumento => Boolean(item))

    const instituicoes: LinhaPontuada[] = vizinhas
      .map(item => ({
        linha: item,
        pontos: pontuarInstituicao(item.texto)
      }))
      .sort((a, b) => b.pontos - a.pontos)

    const melhorInstituicao: LinhaPontuada | undefined = instituicoes.find(item => item.pontos >= 3)

    const ordens = [linha.ordem]

    if (melhorInstituicao) {
      ordens.push(melhorInstituicao.linha.ordem)
    }

    candidatos.push({
      inicio: Math.min(...ordens),

      fimCabecalho: Math.max(...ordens),

      curso: linha.texto,

      instituicao: melhorInstituicao?.linha.texto ?? "",

      nivel: identificarNivel(linha.texto),

      periodo: "",

      confianca: pontosCurso + Math.max(melhorInstituicao?.pontos ?? 0, 0)
    })
  }

  return candidatos
}

function deduplicarFormacoes(candidatos: CandidatoFormacao[]) {
  const resultado: CandidatoFormacao[] = []

  const ordenados = [...candidatos].sort((a, b) => a.inicio - b.inicio || b.confianca - a.confianca)

  for (const candidato of ordenados) {
    const duplicado = resultado.some(existente => {
      const mesmoCurso = normalizarTexto(existente.curso) === normalizarTexto(candidato.curso)

      const mesmoPeriodo = normalizarTexto(existente.periodo) === normalizarTexto(candidato.periodo)

      return mesmoCurso && (mesmoPeriodo || !existente.periodo || !candidato.periodo)
    })

    if (!duplicado) {
      resultado.push(candidato)
    }
  }

  return resultado
}

function extrairFormacoes(documento: DocumentoCurriculo): FormacaoProfissional[] {
  const secaoExplicita = documento.secoes.formacoes.length > 0

  const linhas = secaoExplicita ? documento.secoes.formacoes : documento.linhas

  const candidatos: CandidatoFormacao[] = []

  for (let posicao = 0; posicao < linhas.length; posicao++) {
    const linha = linhas[posicao]

    if (!linha) {
      continue
    }

    const umaLinha = analisarFormacaoUmaLinha(linha, secaoExplicita)

    if (umaLinha && umaLinha.confianca >= (secaoExplicita ? 5 : 10)) {
      candidatos.push(umaLinha)

      continue
    }

    if (!possuiPeriodo(linha.texto)) {
      continue
    }

    const multilinha = analisarFormacaoMultilinha(linhas, posicao, secaoExplicita)

    if (multilinha && multilinha.confianca >= (secaoExplicita ? 5 : 10)) {
      candidatos.push(multilinha)
    }
  }

  /**
   * Se a seção acadêmica existe mas o currículo não informa datas,
   * ainda tento encontrar curso e instituição usando proximidade.
   */
  if (candidatos.length === 0 && secaoExplicita) {
    candidatos.push(...extrairFormacoesSemPeriodo(linhas))
  }

  return deduplicarFormacoes(candidatos)
    .map(candidato => ({
      instituicao: candidato.instituicao,

      curso: candidato.curso,

      nivel: candidato.nivel,

      periodo: candidato.periodo
    }))
    .filter(formacao => Boolean(formacao.curso))
    .slice(0, 15)
}

/**
 * CURSOS E CERTIFICAÇÕES
 */

function dividirListaCursos(texto: string) {
  const porBullet = texto
    .split(/\s*(?:•|●|▪|◦|·|ÔÇó)\s*/i)
    .map(item => item.trim())
    .filter(Boolean)

  if (porBullet.length > 1) {
    return porBullet
  }

  const porPontoVirgula = texto
    .split(";")
    .map(item => item.trim())
    .filter(Boolean)

  if (porPontoVirgula.length > 1) {
    return porPontoVirgula
  }

  if (texto.includes(",")) {
    const porVirgula = texto
      .split(",")
      .map(item => item.trim())
      .filter(Boolean)

    if (porVirgula.length > 1 && porVirgula.every(item => item.length <= 70)) {
      return porVirgula
    }
  }

  return [texto.trim()]
}

function criarCurso(texto: string): CursoProfissional | null {
  const limpo = texto.trim()

  if (!limpo) {
    return null
  }

  const ano = limpo.match(/\b(19|20)\d{2}\b/)?.[0] ?? ""

  const nome = ano
    ? limpo
        .replace(ano, "")
        .replace(/[\s\-–—|]+$/, "")
        .trim()
    : limpo

  if (!nome) {
    return null
  }

  return {
    nome,
    instituicao: "",
    ano
  }
}

function extrairCursos(documento: DocumentoCurriculo): CursoProfissional[] {
  const resultado: CursoProfissional[] = []

  const linhasCursos = documento.secoes.cursos

  if (linhasCursos.length > 0) {
    for (const linha of linhasCursos) {
      /**
       * Quando a linha possui pipe e uma data, trato como possível
       * estrutura "curso | instituição | ano".
       */
      if (linha.texto.includes("|") && possuiPeriodo(linha.texto)) {
        const campos = linha.texto
          .split("|")
          .map(item => item.trim())
          .filter(Boolean)

        const camposTexto = campos.filter(campo => !possuiPeriodo(campo))

        const periodo = campos.find(campo => possuiPeriodo(campo))

        const nome = camposTexto[0]

        if (nome) {
          resultado.push({
            nome,

            instituicao: camposTexto[1] ?? "",

            ano: periodo?.match(/\b(19|20)\d{2}\b/)?.[0] ?? ""
          })
        }

        continue
      }

      const itens = dividirListaCursos(linha.texto)

      for (const item of itens) {
        const curso = criarCurso(item)

        if (curso) {
          resultado.push(curso)
        }
      }
    }
  } else {
    /**
     * Sem seção explícita eu sou mais conservador para evitar transformar
     * tecnologias, empresas ou descrições em cursos.
     */
    for (const linha of documento.linhas) {
      const normalizado = linha.normalizado

      const marcador =
        /\b(curso|course|certificacao|certification|certificado|certificate|treinamento|training)\b/

      if (!marcador.test(normalizado)) {
        continue
      }

      const conteudo = linha.texto
        .replace(
          /^(curso|course|certificacao|certification|certificado|certificate|treinamento|training)\s*[:\-]\s*/i,
          ""
        )
        .trim()

      if (!conteudo) {
        continue
      }

      const curso = criarCurso(conteudo)

      if (curso) {
        resultado.push(curso)
      }
    }
  }

  const encontrados = new Set<string>()

  return resultado
    .filter(curso => {
      const chave = normalizarTexto(curso.nome)

      if (!chave || encontrados.has(chave)) {
        return false
      }

      encontrados.add(chave)

      return true
    })
    .slice(0, 40)
}

/**
 * RESUMO PROFISSIONAL
 */

function extrairResumo(documento: DocumentoCurriculo) {
  const resumo = documento.secoes.resumo

  if (resumo.length > 0) {
    return resumo
      .map(linha => linha.texto)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
  }

  /**
   * Alguns currículos não possuem um título específico para o resumo.
   * Nesses casos procuro textos descritivos próximos do início.
   */
  return documento.linhas
    .slice(0, 15)
    .filter(linha => linha.secao === null)
    .filter(linha => !linha.bullet)
    .filter(linha => !ehContato(linha.texto))
    .filter(linha => !possuiPeriodo(linha.texto))
    .filter(linha => linha.texto.length >= 45)
    .filter(linha => pontuarCursoAcademico(linha.texto) < 4)
    .map(linha => linha.texto)
    .slice(0, 6)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Análise principal
 *
 * Eu mantenho toda a interpretação como sugestão. Nenhuma informação
 * extraída do currículo é salva automaticamente no perfil.
 */
export function analisarCurriculo(
  arquivo: {
    nome: string
    tipo: string
    tamanho: number
  },
  texto: string,
  perfilAtual: PerfilProfissional
): ResultadoImportacaoCurriculo {
  const documento = prepararDocumento(texto)

  const competencias = encontrarCompetencias(texto, perfilAtual)

  const experiencias = extrairExperiencias(documento, perfilAtual)

  const formacoes = extrairFormacoes(documento)

  const cursos = extrairCursos(documento)

  const resumoProfissional = extrairResumo(documento)

  const avisos: string[] = []

  if (competencias.length === 0) {
    avisos.push("Nenhuma competência cadastrada no perfil foi reconhecida automaticamente.")
  }

  if (experiencias.length === 0) {
    avisos.push(
      "Não consegui estruturar experiências profissionais com confiança suficiente. Revise o conteúdo importado manualmente."
    )
  }

  if (formacoes.length === 0) {
    avisos.push("Não consegui estruturar a formação acadêmica com confiança suficiente.")
  }

  if (cursos.length === 0) {
    avisos.push("Nenhum curso ou certificação foi estruturado automaticamente.")
  }

  return {
    arquivo,

    textoExtraido: texto,

    sugestoes: {
      resumoProfissional,
      competencias,
      experiencias,
      formacoes,
      cursos
    },

    avisos
  }
}
