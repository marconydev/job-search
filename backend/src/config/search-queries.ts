import type { PerfilProfissional } from "../types/perfil-profissional.js"

export type RecorrenciaConsultaBusca = "diaria" | "rotativa"

export type ConsultaBuscaVaga = {
  texto: string

  plataforma: string

  familia: string

  recorrencia: RecorrenciaConsultaBusca

  /**
   * Número máximo de páginas Brave que esta estratégia merece.
   *
   * A maioria das pesquisas usa somente uma página.
   * Portais agregadores prioritários podem avançar até a segunda.
   */
  paginasMaximas: number
}

type NomeFamilia = "suporte" | "sistemas" | "infraestrutura" | "implantacao" | "dados" | "geral"

type PortalAgregador = {
  id: string

  escopo: string

  paginasMaximas: number
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
  "dados",
  "geral"
]

/**
 * Gupy e Sólides deixam de ser simples entradas na matriz genérica.
 *
 * Esses portais concentram vagas de milhares de empresas e, por isso,
 * merecem pesquisas menores por família profissional e maior profundidade
 * de resultados.
 *
 * Eu não exijo "Brasil" dentro da consulta destes portais. A localização
 * continua sendo validada rigorosamente depois que a oportunidade é
 * encontrada.
 */
const PORTAIS_AGREGADORES_PRIORITARIOS: PortalAgregador[] = [
  {
    id: "gupy",

    escopo: "site:gupy.io",

    paginasMaximas: 2
  },

  {
    id: "solides",

    escopo: "site:vagas.solides.com.br",

    paginasMaximas: 2
  }
]

/**
 * Fontes complementares continuam usando a descoberta web.
 *
 * Agrupo plataformas semelhantes quando isso reduz chamadas redundantes
 * sem remover uma fonte relevante.
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
     * O Remote Rocketship é usado somente como fonte de descoberta via Brave.
     *
     * A aplicação não acessa nem raspa diretamente o portal. A triagem aceita
     * apenas URLs de vagas individuais já indexadas pelo buscador.
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
 * As pesquisas regionais agora complementam os portais prioritários.
 *
 * Gupy não precisa aparecer novamente aqui porque já recebe uma busca
 * própria, dividida por família e com paginação.
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
 * Eu mantenho as consultas pequenas para reduzir competição entre cargos
 * diferentes dentro do ranking do buscador.
 */
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
 * As pesquisas complementares não precisam carregar dezenas de aliases.
 *
 * Seleciono termos representativos e deixo os demais para a rotação.
 */
function criarNucleoComplementar(familias: Record<NomeFamilia, string[]>) {
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

function montarConsultaPortal(portal: PortalAgregador, termos: string[]) {
  const expressao = `(${criarExpressaoTermos(termos)})`

  return `${portal.escopo} ` + expressao
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

  return `${expressaoEmpresas} ` + `${expressaoCargos} ` + "(vagas OR jobs) " + CONTEXTO_LOCALIZACAO
}

function montarConsultaRegional(localizacoes: string[], termos: string[]) {
  const expressaoCargos = `(${criarExpressaoTermos(termos)})`

  const expressaoLocalizacoes = `(${criarExpressaoValores(localizacoes)})`

  return `${ESCOPO_VAGAS_REGIONAIS} ` + `${expressaoCargos} ` + expressaoLocalizacoes
}

/**
 * Cada família recebe sua própria busca nos grandes portais.
 *
 * Isso é propositalmente diferente da estratégia antiga, em que todos
 * os cargos competiam dentro de uma única pesquisa da Gupy ou Sólides.
 */
function criarConsultasPortaisPrioritarios(
  familias: Record<NomeFamilia, string[]>
): ConsultaBuscaVaga[] {
  const consultas: ConsultaBuscaVaga[] = []

  for (const familia of ORDEM_FAMILIAS) {
    const pacotes = criarPacotes(familias[familia])

    for (const portal of PORTAIS_AGREGADORES_PRIORITARIOS) {
      for (let indice = 0; indice < pacotes.length; indice++) {
        const pacote = pacotes[indice]

        if (!pacote || pacote.length === 0) {
          continue
        }

        consultas.push({
          texto: montarConsultaPortal(portal, pacote),

          plataforma: portal.id,

          familia: `portal-${familia}`,

          recorrencia: indice === 0 ? "diaria" : "rotativa",

          paginasMaximas: portal.paginasMaximas
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

/**
 * Empresas e regiões continuam importantes, mas agora entram depois das
 * pesquisas estruturadas dos portais.
 *
 * Dessa maneira elas aproveitam o saldo diário da Brave em vez de
 * bloquear a cobertura de Gupy e Sólides.
 */
function criarConsultasEstrategicas(familias: Record<NomeFamilia, string[]>): ConsultaBuscaVaga[] {
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
    const pacotes = criarPacotes(familias[familia])

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
 * Ordem de prioridade:
 *
 * 1. Gupy e Sólides, separados por família profissional;
 * 2. fontes web complementares;
 * 3. empresas e regiões estratégicas;
 * 4. aliases detalhados em rotação.
 *
 * A quantidade de chamadas continua sendo controlada pelo job-discovery.
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

    /**
     * Se a mesma busca surgir como diária e rotativa, preservo a diária.
     *
     * Se ambas tiverem a mesma recorrência, preservo a que puder consultar
     * mais páginas.
     */
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
