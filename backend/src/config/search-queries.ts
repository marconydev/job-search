import type { PerfilProfissional } from "../types/perfil-profissional.js"

export type RecorrenciaConsultaBusca = "diaria" | "rotativa"

export type ConsultaBuscaVaga = {
  texto: string

  plataforma: string

  familia: string

  recorrencia: RecorrenciaConsultaBusca
}

type NomeFamilia = "suporte" | "sistemas" | "infraestrutura" | "implantacao" | "dados" | "geral"

type PlataformaBusca = {
  id: string

  escopo: string
}

type GrupoEmpresas = {
  id: string

  empresas: string[]
}

type RegiaoPrioritaria = {
  id: string

  localizacoes: string[]
}

const ORDEM_FAMILIAS: NomeFamilia[] = [
  "suporte",
  "sistemas",
  "infraestrutura",
  "implantacao",
  "dados",
  "geral"
]

/**
 * Eu mantenho aqui os portais gerais nos quais quero procurar vagas.
 *
 * Os cargos continuam vindo do perfil profissional. Assim não duplico
 * nomenclaturas entre o perfil e a estratégia de descoberta.
 */
const PLATAFORMAS_BUSCA: PlataformaBusca[] = [
  {
    id: "gupy",

    escopo: "site:gupy.io"
  },
  {
    id: "linkedin",

    escopo: "site:linkedin.com/jobs/view"
  },
  {
    id: "indeed",

    escopo: "site:br.indeed.com/viewjob"
  },
  {
    id: "workday",

    escopo: "(site:myworkdayjobs.com OR site:myworkdaysite.com)"
  },
  {
    id: "solides",

    escopo: "site:vagas.solides.com.br"
  },
  {
    id: "pandape",

    escopo: "(site:pandape.infojobs.com.br OR site:pandape.catho.com.br)"
  },
  {
    id: "vagas",

    escopo: "site:vagas.com.br"
  },
  {
    id: "infojobs",

    escopo: "site:infojobs.com.br"
  },
  {
    id: "catho",

    escopo: "site:catho.com.br"
  },
  {
    id: "lever",

    escopo: "site:jobs.lever.co"
  },
  {
    id: "greenhouse",

    escopo: "(site:job-boards.greenhouse.io OR site:boards.greenhouse.io)"
  },
  {
    id: "workable",

    escopo: "site:apply.workable.com"
  },
  {
    id: "smartrecruiters",

    escopo: "site:jobs.smartrecruiters.com"
  },
  {
    id: "ashby",

    escopo: "site:jobs.ashbyhq.com"
  },
  {
    id: "recruitee",

    escopo: "site:recruitee.com"
  },
  {
    id: "web",

    escopo: ""
  }
]

/**
 * Além das buscas gerais, eu priorizo empresas que possuem volume
 * relevante de oportunidades em tecnologia, operações, suporte,
 * implantação, sistemas, infraestrutura e dados.
 *
 * Não crio uma chamada por empresa. Agrupo organizações relacionadas
 * para preservar o orçamento diário da Brave.
 */
const GRUPOS_EMPRESAS_PRIORITARIAS: GrupoEmpresas[] = [
  {
    id: "financeiro",

    empresas: ["Itaú", "Bradesco", "Safra", "Sicredi", "Sicoob", "BTG Pactual", "XP"]
  },
  {
    id: "fintech",

    empresas: [
      "Nubank",
      "Neon",
      "Mercado Livre",
      "Mercado Pago",
      "PicPay",
      "Inter",
      "PagBank",
      "Stone",
      "C6 Bank",
      "Cielo"
    ]
  },
  {
    id: "tecnologia",

    empresas: [
      "TOTVS",
      "Accenture",
      "Senior Sistemas",
      "Softplan",
      "TIVIT",
      "Matera",
      "Serasa Experian",
      "Dock"
    ]
  }
]

/**
 * As buscas gerais continuam nacionais.
 *
 * Estas regiões recebem apenas uma prioridade adicional porque concentram
 * muitos empregadores de tecnologia e podem ficar escondidas em uma
 * pesquisa nacional muito ampla.
 */
const REGIOES_PRIORITARIAS: RegiaoPrioritaria[] = [
  {
    id: "sudeste",

    localizacoes: [
      "São Paulo",
      "Campinas",
      "Barueri",
      "Belo Horizonte",
      "Uberlândia",
      "Rio de Janeiro",
      "Vitória"
    ]
  },
  {
    id: "sul",

    localizacoes: [
      "Curitiba",
      "Florianópolis",
      "Blumenau",
      "Joinville",
      "Porto Alegre",
      "Londrina",
      "Maringá"
    ]
  },
  {
    id: "centro-oeste",

    localizacoes: ["Brasília", "Goiânia", "Campo Grande", "Cuiabá", "Anápolis"]
  }
]

const PALAVRAS_FAMILIA: Record<Exclude<NomeFamilia, "geral">, string[]> = {
  suporte: [
    "support",
    "suporte",
    "help desk",
    "helpdesk",
    "service desk",
    "desktop support",
    "field service",
    "support engineer",
    "support specialist",
    "support technician",
    "technical service"
  ],

  sistemas: [
    "sistema",
    "systems",
    "application",
    "aplicacao",
    "aplicacoes",
    "sustentacao",
    "production support",
    "ams analyst"
  ],

  infraestrutura: [
    "infraestrutura",
    "infrastructure",
    "noc",
    "monitoramento",
    "monitoring",
    "observabilidade",
    "observability",
    "it operations",
    "technical operations"
  ],

  implantacao: ["implantacao", "implementation", "onboarding", "customer success"],

  dados: [
    "data analyst",
    "analista de dados",
    "analista de bi",
    "bi analyst",
    "business intelligence"
  ]
}

/**
 * As consultas gerais precisam trazer tanto oportunidades nacionais
 * quanto vagas remotas que aceitem candidatos do Brasil ou LATAM.
 */
const CONTEXTO_LOCALIZACAO = '(Brasil OR Brazil OR LATAM OR "Latin America" OR remoto OR remote)'

/**
 * Nas buscas regionais eu concentro os principais portais que costumam
 * devolver páginas individuais de vagas.
 *
 * Isso reduz a chance de consumir uma chamada estratégica com páginas
 * institucionais ou artigos.
 */
const ESCOPO_VAGAS_REGIONAIS =
  "(site:gupy.io OR site:linkedin.com/jobs/view OR site:br.indeed.com/viewjob OR site:myworkdayjobs.com)"

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function limparTermoBusca(valor: string) {
  return valor.replace(/"/g, "").replace(/\s+/g, " ").trim()
}

function deduplicarCargos(perfil: PerfilProfissional) {
  const cargos = [...perfil.cargosPrincipais, ...perfil.cargosRelacionados]

  const unicos = new Map<string, string>()

  for (const cargo of cargos) {
    const limpo = limparTermoBusca(cargo)

    if (!limpo) {
      continue
    }

    const chave = normalizarTexto(limpo)

    if (!unicos.has(chave)) {
      unicos.set(chave, limpo)
    }
  }

  return [...unicos.values()]
}

function identificarFamilia(cargo: string): NomeFamilia {
  const normalizado = normalizarTexto(cargo)

  for (const familia of ORDEM_FAMILIAS) {
    if (familia === "geral") {
      continue
    }

    const termos = PALAVRAS_FAMILIA[familia]

    if (termos.some(termo => normalizado.includes(normalizarTexto(termo)))) {
      return familia
    }
  }

  return "geral"
}

function criarFamilias(perfil: PerfilProfissional) {
  const familias: Record<NomeFamilia, string[]> = {
    suporte: [],
    sistemas: [],
    infraestrutura: [],
    implantacao: [],
    dados: [],
    geral: []
  }

  for (const cargo of deduplicarCargos(perfil)) {
    const familia = identificarFamilia(cargo)

    familias[familia].push(cargo)
  }

  return familias
}

function contarPalavras(valor: string) {
  return valor.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Eu agrupo cargos equivalentes em uma mesma chamada Brave.
 *
 * Além do limite de seis termos, controlo tamanho e quantidade de
 * palavras para manter espaço para site:, operadores e localização.
 */
function criarPacotes(termos: string[]) {
  const pacotes: string[][] = []

  let atual: string[] = []

  for (const termo of termos) {
    const candidato = [...atual, termo]

    const expressao = candidato.map(item => `"${item}"`).join(" OR ")

    const excedeu = candidato.length > 6 || expressao.length > 280 || contarPalavras(expressao) > 34

    if (excedeu && atual.length > 0) {
      pacotes.push(atual)

      atual = [termo]

      continue
    }

    atual = candidato
  }

  if (atual.length > 0) {
    pacotes.push(atual)
  }

  return pacotes
}

function localizarTermoPreferido(termos: string[], preferencias: string[]) {
  for (const preferencia of preferencias) {
    const encontrada = termos.find(termo => normalizarTexto(termo) === normalizarTexto(preferencia))

    if (encontrada) {
      return encontrada
    }
  }

  return termos[0]
}

/**
 * Esta expressão é pesquisada diariamente em todas as plataformas gerais.
 *
 * O restante das nomenclaturas entra nas consultas rotativas.
 */
function criarNucleoDiario(familias: Record<NomeFamilia, string[]>) {
  const candidatos = [
    localizarTermoPreferido(familias.suporte, ["analista de suporte", "technical support"]),

    localizarTermoPreferido(
      familias.suporte.filter(
        termo => normalizarTexto(termo) !== normalizarTexto("analista de suporte")
      ),
      ["technical support", "support analyst"]
    ),

    localizarTermoPreferido(familias.sistemas, ["analista de sistemas", "application support"]),

    localizarTermoPreferido(familias.infraestrutura, ["analista de infraestrutura", "noc analyst"]),

    localizarTermoPreferido(familias.implantacao, [
      "analista de implantacao",
      "implementation analyst"
    ]),

    localizarTermoPreferido(familias.dados, ["analista de dados", "data analyst"])
  ].filter((termo): termo is string => Boolean(termo))

  const unicos = new Map<string, string>()

  for (const termo of candidatos) {
    unicos.set(normalizarTexto(termo), termo)
  }

  /**
   * Se alguma família estiver vazia, completo o núcleo com outros
   * cargos efetivamente configurados no perfil.
   */
  const todos = [
    ...familias.suporte,
    ...familias.sistemas,
    ...familias.infraestrutura,
    ...familias.implantacao,
    ...familias.dados,
    ...familias.geral
  ]

  for (const termo of todos) {
    if (unicos.size >= 8) {
      break
    }

    const chave = normalizarTexto(termo)

    if (!unicos.has(chave)) {
      unicos.set(chave, termo)
    }
  }

  return [...unicos.values()].slice(0, 8)
}

/**
 * As consultas estratégicas precisam ser menores que o núcleo geral.
 *
 * Seleciono até um cargo representativo por família. Dessa maneira uma
 * única pesquisa consegue procurar suporte, sistemas, infraestrutura,
 * implantação e dados sem ficar longa demais.
 */
function criarNucleoEstrategico(familias: Record<NomeFamilia, string[]>) {
  const candidatos = [
    localizarTermoPreferido(familias.suporte, ["analista de suporte", "technical support"]),

    localizarTermoPreferido(familias.sistemas, ["analista de sistemas", "application support"]),

    localizarTermoPreferido(familias.infraestrutura, ["analista de infraestrutura", "noc analyst"]),

    localizarTermoPreferido(familias.implantacao, [
      "analista de implantacao",
      "implementation analyst"
    ]),

    localizarTermoPreferido(familias.dados, ["analista de dados", "data analyst"])
  ].filter((termo): termo is string => Boolean(termo))

  const unicos = new Map<string, string>()

  for (const termo of candidatos) {
    unicos.set(normalizarTexto(termo), termo)
  }

  const todos = [
    ...familias.suporte,
    ...familias.sistemas,
    ...familias.infraestrutura,
    ...familias.implantacao,
    ...familias.dados,
    ...familias.geral
  ]

  for (const termo of todos) {
    if (unicos.size >= 5) {
      break
    }

    const chave = normalizarTexto(termo)

    if (!unicos.has(chave)) {
      unicos.set(chave, termo)
    }
  }

  return [...unicos.values()].slice(0, 5)
}

function criarExpressaoTermos(termos: string[]) {
  return termos.map(termo => `"${termo}"`).join(" OR ")
}

function criarExpressaoValores(valores: string[]) {
  return valores.map(valor => `"${valor}"`).join(" OR ")
}

function montarConsulta(plataforma: PlataformaBusca, termos: string[]) {
  const expressao = `(${criarExpressaoTermos(termos)})`

  if (plataforma.id === "web") {
    return `${expressao} ${CONTEXTO_LOCALIZACAO}`
  }

  return `${plataforma.escopo} ${expressao}`
}

/**
 * Nas empresas prioritárias eu ainda exijo algum sinal de página de vaga.
 *
 * A decisão final continua sendo feita pela triagem e pelo matcher. A
 * presença da empresa apenas aumenta a chance de a Brave descobrir a
 * oportunidade; ela nunca aumenta o score da vaga.
 */
function montarConsultaEmpresas(empresas: string[], termos: string[]) {
  const expressaoEmpresas = `(${criarExpressaoValores(empresas)})`

  const expressaoCargos = `(${criarExpressaoTermos(termos)})`

  return `${expressaoEmpresas} ` + `${expressaoCargos} ` + "(vaga OR vagas OR careers OR jobs)"
}

/**
 * Para regiões prioritárias eu uso somente portais que costumam devolver
 * páginas individuais.
 *
 * A localização é usada apenas na descoberta. Ela não substitui a
 * validação de localização feita posteriormente.
 */
function montarConsultaRegional(localizacoes: string[], termos: string[]) {
  const expressaoCargos = `(${criarExpressaoTermos(termos)})`

  const expressaoLocalizacoes = `(${criarExpressaoValores(localizacoes)})`

  return `${ESCOPO_VAGAS_REGIONAIS} ` + `${expressaoCargos} ` + expressaoLocalizacoes
}

function criarConsultasEstrategicas(familias: Record<NomeFamilia, string[]>): ConsultaBuscaVaga[] {
  const nucleo = criarNucleoEstrategico(familias)

  if (nucleo.length === 0) {
    return []
  }

  const consultas: ConsultaBuscaVaga[] = []

  for (const grupo of GRUPOS_EMPRESAS_PRIORITARIAS) {
    consultas.push({
      texto: montarConsultaEmpresas(grupo.empresas, nucleo),

      plataforma: `empresas-${grupo.id}`,

      familia: "empresas",

      recorrencia: "diaria"
    })
  }

  for (const regiao of REGIOES_PRIORITARIAS) {
    consultas.push({
      texto: montarConsultaRegional(regiao.localizacoes, nucleo),

      plataforma: `regiao-${regiao.id}`,

      familia: "regional",

      recorrencia: "diaria"
    })
  }

  return consultas
}

/**
 * Eu gero três camadas:
 *
 * 1. uma pesquisa diária ampla em cada plataforma;
 * 2. seis pesquisas estratégicas por empresas e regiões;
 * 3. uma matriz rotativa com todas as nomenclaturas do perfil.
 *
 * O job-discovery continua responsável por respeitar o limite de 30
 * chamadas e por rotacionar o que não couber na execução atual.
 */
export function gerarConsultasBuscaVagas(perfil: PerfilProfissional): ConsultaBuscaVaga[] {
  const familias = criarFamilias(perfil)

  const nucleo = criarNucleoDiario(familias)

  if (nucleo.length === 0) {
    return []
  }

  const consultas: ConsultaBuscaVaga[] = []

  for (const plataforma of PLATAFORMAS_BUSCA) {
    consultas.push({
      texto: montarConsulta(plataforma, nucleo),

      plataforma: plataforma.id,

      familia: "nucleo",

      recorrencia: "diaria"
    })
  }

  consultas.push(...criarConsultasEstrategicas(familias))

  const pacotesPorFamilia = new Map<NomeFamilia, string[][]>()

  let maiorQuantidadePacotes = 0

  for (const familia of ORDEM_FAMILIAS) {
    const pacotes = criarPacotes(familias[familia])

    pacotesPorFamilia.set(familia, pacotes)

    maiorQuantidadePacotes = Math.max(maiorQuantidadePacotes, pacotes.length)
  }

  /**
   * Intercalo família e plataforma para evitar que uma execução parcial
   * pesquise apenas um único portal ou somente uma única área.
   */
  for (let indicePacote = 0; indicePacote < maiorQuantidadePacotes; indicePacote++) {
    for (const familia of ORDEM_FAMILIAS) {
      const pacote = pacotesPorFamilia.get(familia)?.[indicePacote]

      if (!pacote || pacote.length === 0) {
        continue
      }

      for (const plataforma of PLATAFORMAS_BUSCA) {
        consultas.push({
          texto: montarConsulta(plataforma, pacote),

          plataforma: plataforma.id,

          familia,

          recorrencia: "rotativa"
        })
      }
    }
  }

  /**
   * Algumas consultas podem coincidir exatamente.
   *
   * Eu removo a duplicidade sem perder a prioridade das consultas diárias.
   */
  const unicas = new Map<string, ConsultaBuscaVaga>()

  for (const consulta of consultas) {
    const existente = unicas.get(consulta.texto)

    if (!existente || consulta.recorrencia === "diaria") {
      unicas.set(consulta.texto, consulta)
    }
  }

  return [...unicas.values()]
}
