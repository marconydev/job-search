import type { PerfilProfissional } from "../types/perfil-profissional.js"

export type RecorrenciaConsultaBusca = "diaria" | "rotativa"

export type ConsultaBuscaVaga = {
  texto: string

  plataforma: string

  familia: string

  recorrencia: RecorrenciaConsultaBusca

  /**
   * Número máximo de páginas Brave que esta estratégia merece.
   */
  paginasMaximas: number
}

type NomeFamilia =
  | "suporte"
  | "sistemas"
  | "infraestrutura"
  | "implantacao"
  | "processos"
  | "dados"
  | "geral"

type PortalAgregador = {
  id: string

  escopo: string

  paginasMaximas: number
}

type EstrategiaFamiliaPortal = {
  tituloPrincipal: string | null

  titulosRelacionados: string[]

  paginasPrincipais: number
}

type PlataformaComplementar = {
  id: string

  escopo: string

  restringirAoBrasil: boolean
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
  "processos",
  "dados",
  "geral"
]

/**
 * Títulos utilizados tanto pela busca web complementar quanto
 * pela coleta nativa da Gupy.
 *
 * A ordem importa:
 * primeiro coloco os nomes mais usados no mercado brasileiro.
 */
const ESTRATEGIAS_FAMILIAS_PORTAIS: Record<NomeFamilia, EstrategiaFamiliaPortal> = {
  suporte: {
    tituloPrincipal: "Analista de Suporte",

    titulosRelacionados: [
      "Analista de Suporte Técnico",
      "Suporte Técnico",
      "Técnico de Suporte",
      "Analista de Service Desk",
      "Analista de Help Desk"
    ],

    paginasPrincipais: 2
  },

  sistemas: {
    tituloPrincipal: "Analista de Sistemas",

    titulosRelacionados: [
      "Analista de Sustentação",
      "Analista de Aplicações",
      "Suporte de Sistemas",
      "Suporte de Aplicação",
      "Analista Funcional"
    ],

    paginasPrincipais: 2
  },

  infraestrutura: {
    tituloPrincipal: "Analista de Infraestrutura",

    titulosRelacionados: [
      "Analista de Redes",
      "Analista NOC",
      "Analista de Monitoramento",
      "Administrador de Sistemas",
      "Analista de Operações de TI"
    ],

    paginasPrincipais: 2
  },

  implantacao: {
    tituloPrincipal: "Analista de Implantação",

    titulosRelacionados: [
      "Consultor de Implantação",
      "Especialista de Implantação",
      "Analista de Implementação",
      "Customer Onboarding",
      "Onboarding Specialist"
    ],

    paginasPrincipais: 1
  },

  processos: {
    tituloPrincipal: "Analista de Processos",

    titulosRelacionados: [
      "Analista de Negócios",
      "Analista BPM",
      "Analista de Processos de Negócio",
      "Business Process Analyst",
      "BPM Analyst"
    ],

    paginasPrincipais: 1
  },

  dados: {
    tituloPrincipal: "Analista de Dados",

    titulosRelacionados: [
      "Analista de BI",
      "Business Intelligence Analyst",
      "Data Analyst",
      "Power BI Analyst"
    ],

    paginasPrincipais: 1
  },

  geral: {
    tituloPrincipal: null,

    titulosRelacionados: [],

    paginasPrincipais: 1
  }
}

/**
 * Gupy e Sólides agora possuem coleta nativa.
 *
 * Portanto nenhuma delas precisa consumir chamadas Brave dedicadas.
 *
 * A estrutura permanece preparada para outro portal prioritário futuro
 * que não possua integração direta.
 */
const PORTAIS_AGREGADORES_PRIORITARIOS: PortalAgregador[] = []

/**
 * Fontes complementares continuam usando Brave.
 *
 * Vagas.com.br, InfoJobs e Catho ficam agrupados em uma mesma
 * estratégia para aproveitar melhor cada chamada.
 *
 * Os portais adicionais enviados pelo usuário serão tratados em um
 * commit separado para que também recebam classificação de provedor,
 * e não apenas apareçam como resultados genéricos da web.
 */
const PLATAFORMAS_COMPLEMENTARES: PlataformaComplementar[] = [
  {
    id: "linkedin",

    escopo: "site:linkedin.com/jobs/view",

    restringirAoBrasil: true
  },

  {
    id: "indeed",

    escopo: "site:br.indeed.com/viewjob",

    restringirAoBrasil: false
  },

  {
    id: "workday",

    escopo: "(site:myworkdayjobs.com OR site:myworkdaysite.com)",

    restringirAoBrasil: true
  },

  {
    id: "portais-br",

    escopo:
      "(" +
      "site:vagas.com.br OR " +
      "site:infojobs.com.br OR " +
      "site:catho.com.br OR " +
      "site:pandape.infojobs.com.br OR " +
      "site:pandape.catho.com.br" +
      ")",

    restringirAoBrasil: false
  },

  {
    id: "ats",

    escopo:
      "(" +
      "site:jobs.lever.co OR " +
      "site:jobs.eu.lever.co OR " +
      "site:job-boards.greenhouse.io OR " +
      "site:boards.greenhouse.io OR " +
      "site:apply.workable.com OR " +
      "site:jobs.smartrecruiters.com OR " +
      "site:jobs.ashbyhq.com OR " +
      "site:recruitee.com" +
      ")",

    restringirAoBrasil: true
  },

  {
    /**
     * O Remote Rocketship continua apenas como descoberta Brave.
     */
    id: "remote-rocketship",

    escopo: "(site:remoterocketship.com/company OR site:remoterocketship.com/br/empresa)",

    restringirAoBrasil: false
  },

  {
    id: "web",

    escopo: "",

    restringirAoBrasil: true
  }
]

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

  processos: [
    "analista de processos",
    "process analyst",
    "business process",
    "bpm",
    "analista de negocios",
    "business analyst",
    "melhoria continua"
  ],

  dados: [
    "data analyst",
    "analista de dados",
    "analista de bi",
    "bi analyst",
    "business intelligence"
  ]
}

const CONTEXTO_LOCALIZACAO = "(Brasil OR Brazil)"

/**
 * Gupy não aparece neste escopo porque já será coletada diretamente.
 */
const ESCOPO_VAGAS_REGIONAIS =
  "(" +
  "site:linkedin.com/jobs/view OR " +
  "site:br.indeed.com/viewjob OR " +
  "site:myworkdayjobs.com OR " +
  "site:vagas.com.br" +
  ")"

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

function deduplicarTermos(termos: string[]) {
  const unicos = new Map<string, string>()

  for (const termo of termos) {
    const limpo = limparTermoBusca(termo)

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

function deduplicarCargos(perfil: PerfilProfissional) {
  return deduplicarTermos([...perfil.cargosPrincipais, ...perfil.cargosRelacionados])
}

function identificarFamilia(cargo: string): NomeFamilia {
  const normalizado = normalizarTexto(cargo)

  /**
   * Estes cargos são de sustentação/aplicações e não devem cair
   * genericamente em suporte só por conterem a palavra support.
   */
  const termosSistemasEspecificos = [
    "application support",
    "production support",
    "ams analyst",
    "suporte de sistemas",
    "suporte de aplicacao",
    "analista de sustentacao"
  ]

  if (termosSistemasEspecificos.some(termo => normalizado.includes(termo))) {
    return "sistemas"
  }

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
    processos: [],
    dados: [],
    geral: []
  }

  for (const cargo of deduplicarCargos(perfil)) {
    const familia = identificarFamilia(cargo)

    familias[familia].push(cargo)
  }

  return familias
}

/**
 * Termos utilizados pelo coletor nativo da Gupy.
 *
 * Prioridade:
 *
 * 1. título brasileiro principal de cada família presente no perfil;
 * 2. cargos que realmente existem no perfil salvo;
 * 3. sinônimos brasileiros e relacionados.
 *
 * O limite de 30 evita centenas de requisições redundantes sem
 * sacrificar a cobertura principal.
 */
export function gerarTermosBuscaNativaGupy(perfil: PerfilProfissional) {
  const familias = criarFamilias(perfil)

  const principais: string[] = []

  const relacionados: string[] = []

  for (const familia of ORDEM_FAMILIAS) {
    const possuiCargoNaFamilia = familias[familia].length > 0

    if (!possuiCargoNaFamilia) {
      continue
    }

    const estrategia = ESTRATEGIAS_FAMILIAS_PORTAIS[familia]

    if (estrategia.tituloPrincipal) {
      principais.push(estrategia.tituloPrincipal)
    }

    relacionados.push(...estrategia.titulosRelacionados)
  }

  const termos = deduplicarTermos([
    ...principais,

    ...deduplicarCargos(perfil),

    ...relacionados
  ])

  return termos.slice(0, 30)
}

/**
 * A Sólides utiliza a mesma família de cargos brasileiros da Gupy.
 *
 * Como a coleta da Sólides exige abertura das páginas HTML das vagas,
 * mantenho um conjunto um pouco menor do que na Gupy, cuja API pública
 * devolve os dados diretamente em JSON.
 */
export function gerarTermosBuscaNativaSolides(
  perfil: PerfilProfissional
) {
  return gerarTermosBuscaNativaGupy(
    perfil
  ).slice(0, 20)
}

function criarTermosRotativosFamilia(familia: NomeFamilia, termosPerfil: string[]) {
  const estrategia = ESTRATEGIAS_FAMILIAS_PORTAIS[familia]

  const principalNormalizado = estrategia.tituloPrincipal
    ? normalizarTexto(estrategia.tituloPrincipal)
    : null

  return deduplicarTermos([...estrategia.titulosRelacionados, ...termosPerfil]).filter(
    termo => normalizarTexto(termo) !== principalNormalizado
  )
}

function contarPalavras(valor: string) {
  return valor.trim().split(/\s+/).filter(Boolean).length
}

function criarPacotes(
  termos: string[],
  limiteItens = 4,
  limiteCaracteres = 220,
  limitePalavras = 28
) {
  const pacotes: string[][] = []

  let atual: string[] = []

  for (const termo of termos) {
    const candidato = [...atual, termo]

    const expressao = candidato.map(item => `"${item}"`).join(" OR ")

    const excedeu =
      candidato.length > limiteItens ||
      expressao.length > limiteCaracteres ||
      contarPalavras(expressao) > limitePalavras

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

function criarNucleoComplementar(familias: Record<NomeFamilia, string[]>) {
  const candidatos = ORDEM_FAMILIAS.map(
    familia => ESTRATEGIAS_FAMILIAS_PORTAIS[familia].tituloPrincipal
  ).filter((termo): termo is string => Boolean(termo))

  const unicos = new Map<string, string>()

  for (const termo of candidatos) {
    unicos.set(normalizarTexto(termo), termo)
  }

  const todos = [
    ...familias.suporte,
    ...familias.sistemas,
    ...familias.infraestrutura,
    ...familias.implantacao,
    ...familias.processos,
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

function montarConsultaPortal(portal: PortalAgregador, termos: string[]) {
  const expressao =
    termos.length === 1 ? criarExpressaoTermos(termos) : `(${criarExpressaoTermos(termos)})`

  return `${portal.escopo} ${expressao}`
}

function montarConsultaComplementar(plataforma: PlataformaComplementar, termos: string[]) {
  const expressao = `(${criarExpressaoTermos(termos)})`

  const partes = [
    plataforma.escopo,

    expressao,

    plataforma.restringirAoBrasil ? CONTEXTO_LOCALIZACAO : ""
  ].filter(Boolean)

  return partes.join(" ")
}

function montarConsultaEmpresas(empresas: string[], termos: string[]) {
  const expressaoEmpresas = `(${criarExpressaoValores(empresas)})`

  const expressaoCargos = `(${criarExpressaoTermos(termos)})`

  return `${expressaoEmpresas} ${expressaoCargos} (vagas OR jobs) ${CONTEXTO_LOCALIZACAO}`
}

function montarConsultaRegional(localizacoes: string[], termos: string[]) {
  const expressaoCargos = `(${criarExpressaoTermos(termos)})`

  const expressaoLocalizacoes = `(${criarExpressaoValores(localizacoes)})`

  return `${ESCOPO_VAGAS_REGIONAIS} ${expressaoCargos} ${expressaoLocalizacoes}`
}

/**
 * Neste Commit 1 somente a Sólides continua sendo tratada como
 * portal prioritário via Brave.
 */
function criarConsultasPortaisPrioritarios(
  familias: Record<NomeFamilia, string[]>
): ConsultaBuscaVaga[] {
  const consultas: ConsultaBuscaVaga[] = []

  for (const familia of ORDEM_FAMILIAS) {
    const estrategia = ESTRATEGIAS_FAMILIAS_PORTAIS[familia]

    if (!estrategia.tituloPrincipal) {
      continue
    }

    for (const portal of PORTAIS_AGREGADORES_PRIORITARIOS) {
      consultas.push({
        texto: montarConsultaPortal(portal, [estrategia.tituloPrincipal]),

        plataforma: portal.id,

        familia: `portal-${familia}`,

        recorrencia: "diaria",

        paginasMaximas: Math.min(portal.paginasMaximas, estrategia.paginasPrincipais)
      })
    }
  }

  for (const familia of ORDEM_FAMILIAS) {
    const termosRotativos = criarTermosRotativosFamilia(familia, familias[familia])

    const pacotes = criarPacotes(termosRotativos, 2, 180, 20)

    for (const portal of PORTAIS_AGREGADORES_PRIORITARIOS) {
      for (const pacote of pacotes) {
        consultas.push({
          texto: montarConsultaPortal(portal, pacote),

          plataforma: portal.id,

          familia: `portal-${familia}`,

          recorrencia: "rotativa",

          paginasMaximas: 1
        })
      }
    }
  }

  return consultas
}

function criarConsultasComplementares(
  familias: Record<NomeFamilia, string[]>
): ConsultaBuscaVaga[] {
  const nucleo = criarNucleoComplementar(familias)

  if (nucleo.length === 0) {
    return []
  }

  return PLATAFORMAS_COMPLEMENTARES.map(plataforma => ({
    texto: montarConsultaComplementar(plataforma, nucleo),

    plataforma: plataforma.id,

    familia: "nucleo",

    recorrencia: "diaria",

    paginasMaximas: 1
  }))
}

function criarConsultasEstrategicas(
  familias: Record<NomeFamilia, string[]>
): ConsultaBuscaVaga[] {
  const nucleo = criarNucleoComplementar(familias)

  if (nucleo.length === 0) {
    return []
  }

  const consultas: ConsultaBuscaVaga[] = []

  for (const grupo of GRUPOS_EMPRESAS_PRIORITARIAS) {
    consultas.push({
      texto: montarConsultaEmpresas(grupo.empresas, nucleo),

      plataforma: `empresas-${grupo.id}`,

      familia: "empresas",

      recorrencia: "rotativa",

      paginasMaximas: 1
    })
  }

  for (const regiao of REGIOES_PRIORITARIAS) {
    consultas.push({
      texto: montarConsultaRegional(regiao.localizacoes, nucleo),

      plataforma: `regiao-${regiao.id}`,

      familia: "regional",

      recorrencia: "rotativa",

      paginasMaximas: 1
    })
  }

  return consultas
}

function criarConsultasRotativasComplementares(familias: Record<NomeFamilia, string[]>) {
  const consultas: ConsultaBuscaVaga[] = []

  for (const familia of ORDEM_FAMILIAS) {
    const termosRotativos = criarTermosRotativosFamilia(familia, familias[familia])

    const pacotes = criarPacotes(termosRotativos, 2, 180, 20)

    for (const pacote of pacotes) {
      for (const plataforma of PLATAFORMAS_COMPLEMENTARES) {
        consultas.push({
          texto: montarConsultaComplementar(plataforma, pacote),

          plataforma: plataforma.id,

          familia,

          recorrencia: "rotativa",

          paginasMaximas: 1
        })
      }
    }
  }

  return consultas
}

/**
 * Ordem de prioridade da Brave após a Gupy nativa:
 *
 * 1. Sólides, enquanto ainda não possui coletor nativo;
 * 2. fontes web complementares;
 * 3. empresas e regiões estratégicas;
 * 4. aliases detalhados em rotação.
 *
 * Gupy não gera mais nenhuma chamada Brave dedicada.
 */
export function gerarConsultasBuscaVagas(perfil: PerfilProfissional): ConsultaBuscaVaga[] {
  const familias = criarFamilias(perfil)

  const possuiCargo = ORDEM_FAMILIAS.some(familia => familias[familia].length > 0)

  if (!possuiCargo) {
    return []
  }

  const consultas: ConsultaBuscaVaga[] = [
    ...criarConsultasPortaisPrioritarios(familias),

    ...criarConsultasComplementares(familias),

    ...criarConsultasEstrategicas(familias),

    ...criarConsultasRotativasComplementares(familias)
  ]

  const unicas = new Map<string, ConsultaBuscaVaga>()

  for (const consulta of consultas) {
    const existente = unicas.get(consulta.texto)

    if (!existente) {
      unicas.set(consulta.texto, consulta)

      continue
    }

    if (consulta.recorrencia === "diaria" && existente.recorrencia !== "diaria") {
      unicas.set(consulta.texto, consulta)

      continue
    }

    if (
      consulta.recorrencia === existente.recorrencia &&
      consulta.paginasMaximas > existente.paginasMaximas
    ) {
      unicas.set(consulta.texto, consulta)
    }
  }

  return [...unicas.values()]
}