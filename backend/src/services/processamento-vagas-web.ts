import {
  perfilBusca
} from "../config/search-profile.js"

import {
  descobrirPaginasVagas
} from "./job-discovery.js"

import {
  converterVagaWebParaNovaVaga
} from "./conversao-vaga-web.js"

import {
  inspecionarPaginaVaga
} from "../discovery/page-inspector.js"

import {
  matchJob as avaliarVaga
} from "./job-matcher.js"

import {
  createJob as criarVaga,
  isDuplicateJobError as ehErroVagaDuplicada
} from "../repositories/job-repository.js"

import type {
  PaginaClassificada,
  ProvedorPagina
} from "../types/discovery.js"

import type {
  StoredJob as VagaArmazenada
} from "../types/job.js"

import type {
  PaginaSomenteDescoberta,
  PendenciaProcessamentoWeb,
  RecomendacaoDescoberta,
  ResultadoFonteProcessada,
  ResultadoProcessamentoWeb
} from "../types/processamento-web.js"

type OpcoesProcessamentoWeb = {
  salvarCompativeis?: boolean

  /**
   * Só permito chamadas reais à Brave quando a execução informa
   * explicitamente que deseja atualizar a descoberta.
   */
  permitirBuscaLive?: boolean

  /**
   * Informo quantas novas chamadas a execução deseja solicitar.
   *
   * O limite diário definitivo continua sendo aplicado pelo serviço
   * de descoberta.
   */
  limiteChamadasBrave?: number
}

/**
 * Estas plataformas já possuem extração estruturada validada no projeto.
 *
 * LinkedIn, Indeed, agregadores e outras fontes continuam sendo muito
 * importantes, mas são avaliados inicialmente usando os dados que a
 * própria descoberta já trouxe.
 */
const provedoresProcessaveis =
  new Set<ProvedorPagina>([
    "gupy",
    "lever",
    "greenhouse",
    "workable",
    "smartrecruiters"
  ])

/**
 * Mantenho termos complementares porque empresas nem sempre utilizam
 * exatamente os mesmos nomes definidos no meu perfil principal.
 */
const termosComplementaresTitulo = [
  "help desk",
  "service desk",

  "desktop support",
  "field service",

  "support",
  "suporte",

  "noc",

  "monitoring",
  "monitoramento",

  "observability",
  "observabilidade",

  "implementation",
  "implantacao",

  "infraestrutura",

  "sustentacao",
  "sustentação",

  "application support",
  "application analyst",

  "production support",

  "customer onboarding",

  "technical operations",
  "it operations"
]

function normalizarTexto(
  valor: string
) {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
}

function contemExpressao(
  texto: string,
  termo: string
) {
  const textoNormalizado =
    ` ${normalizarTexto(texto)} `

  const termoNormalizado =
    normalizarTexto(
      termo
    )

  if (!termoNormalizado) {
    return false
  }

  return textoNormalizado.includes(
    ` ${termoNormalizado} `
  )
}

/**
 * Faço uma triagem inicial utilizando o título e o snippet retornado
 * pelo mecanismo de busca.
 *
 * Esta etapa não decide definitivamente se a vaga é boa ou ruim.
 * Apenas evita processar páginas claramente sem relação com meu perfil.
 */
function paginaPareceRelacionada(
  pagina: PaginaClassificada
) {
  const contexto = [
    pagina.titulo,
    pagina.descricao
  ]
    .filter(
      (
        valor
      ): valor is string =>
        Boolean(valor)
    )
    .join(" ")

  const cargos = [
    ...perfilBusca
      .cargosPrincipais,

    ...perfilBusca
      .cargosRelacionados,

    ...termosComplementaresTitulo
  ]

  if (
    cargos.some(
      (cargo) =>
        contemExpressao(
          contexto,
          cargo
        )
    )
  ) {
    return true
  }

  /**
   * Alguns anúncios utilizam títulos pouco padronizados.
   *
   * Nesses casos preservo a página quando encontro um indicador
   * profissional acompanhado de pelo menos duas competências que
   * pertencem ao meu perfil.
   */
  const indicadoresCargo = [
    "analista",
    "analyst",

    "support",
    "suporte",

    "technician",
    "tecnico",
    "técnico",

    "specialist",
    "especialista",

    "operations",
    "operacoes",
    "operações"
  ]

  const possuiIndicador =
    indicadoresCargo.some(
      (indicador) =>
        contemExpressao(
          contexto,
          indicador
        )
    )

  if (!possuiIndicador) {
    return false
  }

  const competencias =
    perfilBusca.competencias.filter(
      (competencia) =>
        competencia.termos.some(
          (termo) =>
            contemExpressao(
              contexto,
              termo
            )
        )
    )

  return (
    competencias.length >=
    2
  )
}

/**
 * Identifico páginas que representam listas ou pesquisas em vez de uma
 * oportunidade individual.
 */
function paginaEhListagem(
  pagina: PaginaClassificada
) {
  try {
    const url =
      new URL(
        pagina.url
      )

    const caminho =
      url.pathname
        .toLowerCase()

    if (
      pagina.provedor ===
      "indeed"
    ) {
      return (
        !caminho.includes(
          "/viewjob"
        ) ||
        !url.searchParams.has(
          "jk"
        )
      )
    }

    if (
      pagina.provedor ===
      "linkedin"
    ) {
      return !caminho.includes(
        "/jobs/view/"
      )
    }

    if (
      pagina.provedor ===
      "greenhouse"
    ) {
      return !/\/jobs\/\d+/i.test(
        caminho
      )
    }

    if (
      pagina.provedor ===
      "workable"
    ) {
      return !/\/j\/[a-z0-9]+/i.test(
        caminho
      )
    }

    if (
      pagina.provedor ===
      "smartrecruiters"
    ) {
      const partes =
        caminho
          .split("/")
          .filter(Boolean)

      return (
        partes.length < 2 ||
        !/^\d+/.test(
          partes[1] ??
          ""
        )
      )
    }

    if (
      pagina.provedor ===
      "lever"
    ) {
      const partes =
        caminho
          .split("/")
          .filter(Boolean)

      return (
        partes.length < 2
      )
    }

    if (
      pagina.provedor ===
      "gupy"
    ) {
      return !(
        caminho.includes(
          "/jobs/"
        ) ||
        caminho.includes(
          "/job/"
        )
      )
    }

    if (
      pagina.provedor ===
      "remote-ok"
    ) {
      return (
        caminho === "/" ||
        caminho.includes(
          "customer-support-jobs"
        ) ||
        caminho.includes(
          "technical-jobs"
        ) ||
        caminho.includes(
          "jobs-in-brazil"
        ) ||
        caminho.includes(
          "product-manager-jobs"
        )
      )
    }

    return false
  } catch {
    return true
  }
}

/**
 * Algumas URLs da Workable apontam diretamente para /apply/.
 *
 * Para extração utilizo a página principal da vaga.
 */
function normalizarPaginaParaInspecao(
  pagina: PaginaClassificada
): PaginaClassificada {
  if (
    pagina.provedor !==
    "workable"
  ) {
    return pagina
  }

  try {
    const url =
      new URL(
        pagina.url
      )

    url.pathname =
      url.pathname.replace(
        /\/apply\/?$/i,
        "/"
      )

    return {
      ...pagina,

      url:
        url.toString()
    }
  } catch {
    return pagina
  }
}

function ehProvedorProcessavel(
  pagina: PaginaClassificada
) {
  return provedoresProcessaveis.has(
    pagina.provedor
  )
}

function criarResultadoProvedor(
  provedor: ProvedorPagina
): ResultadoFonteProcessada {
  return {
    provedor,

    encontradas: 0,

    vagasValidas: 0,

    compativeisBrasil: 0,

    incompativeisBrasil: 0,

    indefinidas: 0,

    importadas: 0,

    duplicadas: 0,

    semDadosObrigatorios: 0,

    falhas: 0,

    ignoradas: 0
  }
}

function obterResultadoProvedor(
  resultados: Map<
    ProvedorPagina,
    ResultadoFonteProcessada
  >,

  provedor: ProvedorPagina
) {
  const existente =
    resultados.get(
      provedor
    )

  if (existente) {
    return existente
  }

  const novo =
    criarResultadoProvedor(
      provedor
    )

  resultados.set(
    provedor,
    novo
  )

  return novo
}

function registrarPendencia(
  pendencias:
    PendenciaProcessamentoWeb[],

  pendencia:
    PendenciaProcessamentoWeb
) {
  pendencias.push(
    pendencia
  )
}

function paginaEstaIndisponivel(
  url: string,
  codigoStatus: number
) {
  if (
    codigoStatus >= 400
  ) {
    return true
  }

  try {
    const urlAnalisada =
      new URL(url)

    return (
      urlAnalisada
        .searchParams
        .get(
          "not_found"
        ) ===
      "true" ||

      urlAnalisada
        .searchParams
        .get(
          "error"
        ) ===
      "true"
    )
  } catch {
    return false
  }
}

/**
 * Identifico páginas claramente informativas.
 *
 * Essas páginas costumam aparecer porque utilizam os mesmos termos
 * técnicos das vagas, mas não representam uma oportunidade profissional.
 */
function paginaPareceConteudoInformativo(
  titulo: string,
  url: string
) {
  const texto =
    normalizarTexto(
      titulo
    )

  const padroesFortes = [
    "salary",
    "salaries",
    "salario",
    "quanto ganha",

    "o que faz",
    "what is",

    "job description",

    "guia completo",
    "complete guide",

    "reviews",
    "review",

    "certificacoes",
    "certifications",

    "diferencas",
    "differences",

    "tutorial",

    "como funciona"
  ]

  if (
    padroesFortes.some(
      (padrao) =>
        texto.includes(
          normalizarTexto(
            padrao
          )
        )
    )
  ) {
    return true
  }

  /**
   * Comparativos de ferramentas são uma fonte comum de falso positivo.
   *
   * Um artigo sobre "Best Service Desk Software", por exemplo, contém
   * exatamente o nome de um cargo que busco, mas não representa vaga.
   */
  const falaDeSoftware =
    contemExpressao(
      texto,
      "software"
    )

  const pareceRanking =
    [
      "best",
      "melhores",
      "top",
      "tools",
      "ferramentas"
    ].some(
      (termo) =>
        contemExpressao(
          texto,
          termo
        )
    )

  if (
    falaDeSoftware &&
    pareceRanking
  ) {
    return true
  }

  try {
    const urlAnalisada =
      new URL(url)

    const hostname =
      urlAnalisada.hostname
        .toLowerCase()

    const caminho =
      urlAnalisada.pathname
        .toLowerCase()

    const dominiosConteudo = [
      "learn.g2.com",
      "zendesk.com",
      "capterra.com"
    ]

    const pareceArtigo =
      caminho.includes(
        "/blog/"
      ) ||
      caminho.includes(
        "/artigos/"
      ) ||
      caminho.includes(
        "/reviews/"
      )

    if (
      dominiosConteudo.some(
        (dominio) =>
          hostname.endsWith(
            dominio
          )
      ) &&
      pareceArtigo
    ) {
      return true
    }
  } catch {
    return false
  }

  return false
}

/**
 * O LinkedIn global pode devolver páginas estrangeiras mesmo quando a
 * pesquisa foi direcionada ao Brasil.
 *
 * Por isso exijo algum sinal brasileiro proveniente da própria página,
 * e nunca da consulta utilizada para encontrá-la.
 */
function linkedinTemSinalBrasil(
  pagina:
    PaginaSomenteDescoberta
) {
  try {
    const url =
      new URL(
        pagina.url
      )

    const hostname =
      url.hostname
        .toLowerCase()

    if (
      hostname ===
      "br.linkedin.com" ||
      hostname.endsWith(
        ".br.linkedin.com"
      )
    ) {
      return true
    }
  } catch {
    // Continuo usando o texto como alternativa.
  }

  const contexto =
    normalizarTexto(
      [
        pagina.titulo,
        pagina.descricao
      ]
        .filter(
          (
            valor
          ): valor is string =>
            Boolean(valor)
        )
        .join(" ")
    )

  const contextoComEspacos =
    ` ${contexto} `

  const sinaisBrasil = [
    " brazil ",
    " brasil ",

    " sao paulo ",
    " rio de janeiro ",
    " belo horizonte ",
    " curitiba ",
    " florianopolis ",
    " porto alegre ",
    " recife ",
    " fortaleza ",
    " salvador ",
    " joao pessoa ",
    " campina grande ",
    " brasilia ",
    " goiania ",
    " campinas ",
    " barueri ",
    " uberlandia ",

    " sp ",
    " rj ",
    " mg ",
    " pr ",
    " sc ",
    " rs ",
    " pe ",
    " pb ",
    " ce ",
    " ba ",
    " df ",
    " go "
  ]

  return sinaisBrasil.some(
    (sinal) =>
      contextoComEspacos.includes(
        sinal
      )
  )
}

/**
 * No Indeed considero o domínio brasileiro como um sinal suficientemente
 * forte para a triagem local.
 */
function indeedEhBrasileiro(
  pagina:
    PaginaSomenteDescoberta
) {
  try {
    const hostname =
      new URL(
        pagina.url
      ).hostname
        .toLowerCase()

    return (
      hostname ===
      "br.indeed.com" ||
      hostname.endsWith(
        ".br.indeed.com"
      )
    )
  } catch {
    return false
  }
}

/**
 * Verifico se uma descoberta possui algum indício próprio de Brasil.
 *
 * Não utilizo pagina.consulta aqui.
 *
 * A consulta representa aquilo que pedi à Brave e não uma informação
 * fornecida pela própria oportunidade.
 */
function paginaTemSinalBrasil(
  pagina:
    PaginaSomenteDescoberta
) {
  if (
    pagina.provedor ===
    "linkedin"
  ) {
    return linkedinTemSinalBrasil(
      pagina
    )
  }

  if (
    pagina.provedor ===
    "indeed"
  ) {
    return indeedEhBrasileiro(
      pagina
    )
  }

  let hostname = ""

  try {
    hostname =
      new URL(
        pagina.url
      ).hostname
        .toLowerCase()
  } catch {
    hostname = ""
  }

  /**
   * Domínios terminados em .br fornecem um bom sinal inicial de que o
   * conteúdo pertence ao mercado brasileiro.
   */
  if (
    hostname.endsWith(
      ".br"
    )
  ) {
    return true
  }

  const contexto =
    normalizarTexto(
      [
        pagina.titulo,
        pagina.descricao
      ]
        .filter(
          (
            valor
          ): valor is string =>
            Boolean(valor)
        )
        .join(" ")
    )

  const sinais = [
    "brasil",
    "brazil",

    "sao paulo",
    "rio de janeiro",
    "belo horizonte",
    "curitiba",
    "florianopolis",
    "porto alegre",
    "recife",
    "fortaleza",
    "salvador",
    "joao pessoa",
    "campina grande",
    "brasilia",
    "goiania",
    "campinas",
    "barueri",
    "uberlandia"
  ]

  return sinais.some(
    (sinal) =>
      contexto.includes(
        sinal
      )
  )
}

/**
 * Identifico a modalidade remota somente quando a expressão realmente
 * descreve o regime de trabalho.
 *
 * Não considero simplesmente qualquer ocorrência de "remoto".
 *
 * Uma frase como:
 *
 * "prestar suporte presencial e remoto aos usuários"
 *
 * descreve a forma do atendimento e não significa necessariamente que
 * o profissional poderá trabalhar remotamente.
 */
function detectarTrabalhoRemoto(
  pagina:
    PaginaSomenteDescoberta
) {
  const titulo =
    pagina.titulo

  const descricao =
    pagina.descricao ??
    ""

  const expressoesTitulo = [
    /\bremote\b/i,
    /\bremot[oa]\b/i,
    /\bhome\s*office\b/i,
    /\bwork\s+from\s+home\b/i,
    /\b100%\s*remot[oa]\b/i
  ]

  if (
    expressoesTitulo.some(
      (padrao) =>
        padrao.test(
          titulo
        )
    )
  ) {
    return true
  }

  const expressoesDescricao = [
    /\bvaga\s+(?:100%\s*)?remot[oa]\b/i,

    /\btrabalho\s+(?:100%\s*)?remot[oa]\b/i,

    /\bmodelo\s+(?:de\s+trabalho\s+)?remot[oa]\b/i,

    /\bmodalidade\s+remot[oa]\b/i,

    /\bregime\s+remot[oa]\b/i,

    /\bhome\s*office\b/i,

    /\bwork\s+from\s+home\b/i,

    /\bfully\s+remote\b/i
  ]

  return expressoesDescricao.some(
    (padrao) =>
      padrao.test(
        descricao
      )
  )
}

/**
 * Uso o matcher principal do projeto para avaliar páginas que ainda
 * possuem apenas título e snippet.
 *
 * Assim mantenho somente uma regra de pontuação no sistema.
 */
function avaliarPaginaDescoberta(
  pagina:
    PaginaSomenteDescoberta
): RecomendacaoDescoberta | null {
  if (
    paginaPareceConteudoInformativo(
      pagina.titulo,
      pagina.url
    )
  ) {
    return null
  }

  /**
   * Não recomendo uma descoberta quando não existe nenhum sinal de que
   * a oportunidade pertence ao Brasil ou aceita candidatos brasileiros.
   */
  if (
    !paginaTemSinalBrasil(
      pagina
    )
  ) {
    return null
  }

  const remoto =
    detectarTrabalhoRemoto(
      pagina
    )

  /**
   * Crio uma representação temporária compatível com o matcher.
   *
   * Como paginaTemSinalBrasil já confirmou algum indício brasileiro,
   * uso "Brasil" somente durante esta avaliação local.
   */
  const vagaTemporaria:
    VagaArmazenada = {
    id: 0,

    source:
      pagina.provedor,

    external_id:
      pagina.url,

    company:
      "",

    title:
      pagina.titulo,

    description:
      pagina.descricao ??
      "",

    location:
      "Brasil",

    remote:
      remoto,

    url:
      pagina.url,

    published_at:
      null,

    created_at:
      new Date(0)
        .toISOString()
  }

  const correspondencia =
    avaliarVaga(
      vagaTemporaria
    )

  /**
   * Uso o mesmo corte já adotado pelo projeto.
   */
  if (
    correspondencia.score <
    60
  ) {
    return null
  }

  return {
    provedor:
      pagina.provedor,

    titulo:
      pagina.titulo,

    url:
      pagina.url,

    descricao:
      pagina.descricao,

    consulta:
      pagina.consulta,

    pontuacao:
      correspondencia.score,

    competencias:
      correspondencia
        .matchedSkills,

    motivos:
      correspondencia
        .reasons
  }
}

/**
 * Produzo um ranking das páginas que ainda não possuem extração completa.
 *
 * Esta operação acontece totalmente em memória e não realiza chamadas
 * externas.
 */
function criarRecomendacoesDescoberta(
  paginas:
    PaginaSomenteDescoberta[]
) {
  return paginas
    .map(
      avaliarPaginaDescoberta
    )
    .filter(
      (
        recomendacao
      ): recomendacao is RecomendacaoDescoberta =>
        recomendacao !==
        null
    )
    .sort(
      (
        primeira,
        segunda
      ) => {
        if (
          segunda.pontuacao !==
          primeira.pontuacao
        ) {
          return (
            segunda.pontuacao -
            primeira.pontuacao
          )
        }

        return primeira.titulo
          .localeCompare(
            segunda.titulo,
            "pt-BR"
          )
      }
    )
}

/**
 * Executo descoberta, triagem, extração, avaliação geográfica e,
 * opcionalmente, persistência.
 *
 * Também devolvo recomendações provenientes das páginas que ainda não
 * possuem extração estruturada.
 */
export async function processarVagasWeb(
  opcoes:
    OpcoesProcessamentoWeb = {}
): Promise<
  ResultadoProcessamentoWeb
> {
  const salvarCompativeis =
    opcoes.salvarCompativeis ??
    false

  /**
   * Sem permitirBuscaLive, o serviço de descoberta trabalha somente
   * com o cache existente.
   */
  const paginas =
    await descobrirPaginasVagas({
      permitirBuscaLive:
        opcoes.permitirBuscaLive,

      limiteChamadas:
        opcoes.limiteChamadasBrave
    })

  const paginasRelacionadas =
    paginas.filter(
      paginaPareceRelacionada
    )

  const descartadasPorTitulo =
    paginas.length -
    paginasRelacionadas.length

  const paginasDeListagem =
    paginasRelacionadas.filter(
      paginaEhListagem
    ).length

  const paginasIndividuais =
    paginasRelacionadas.filter(
      (pagina) =>
        !paginaEhListagem(
          pagina
        )
    )

  /**
   * Somente provedores com extratores estruturados são acessados nesta
   * etapa.
   */
  const paginasSelecionadas =
    paginasIndividuais
      .filter(
        ehProvedorProcessavel
      )
      .map(
        normalizarPaginaParaInspecao
      )

  /**
   * As demais páginas continuam preservadas.
   *
   * LinkedIn, Indeed, agregadores, Remote OK, Remotive e sites próprios
   * podem continuar sendo úteis mesmo sem uma extração estruturada.
   */
  const somenteDescoberta:
    PaginaSomenteDescoberta[] =
    paginasIndividuais
      .filter(
        (pagina) =>
          !ehProvedorProcessavel(
            pagina
          )
      )
      .map(
        (pagina) => ({
          provedor:
            pagina.provedor,

          titulo:
            pagina.titulo,

          url:
            pagina.url,

          descricao:
            pagina.descricao,

          consulta:
            pagina.consulta
        })
      )

  /**
   * O ranking destas páginas não realiza nenhuma nova pesquisa.
   */
  const recomendacoesDescoberta =
    criarRecomendacoesDescoberta(
      somenteDescoberta
    )

  const resultadosPorProvedor =
    new Map<
      ProvedorPagina,
      ResultadoFonteProcessada
    >()

  const pendencias:
    PendenciaProcessamentoWeb[] = []

  let vagasExtraidas = 0

  let compativeisBrasil = 0

  let incompativeisBrasil = 0

  let indefinidas = 0

  let importadas = 0

  let duplicadas = 0

  let semDadosObrigatorios = 0

  let falhas = 0

  /**
   * Processo os ATS sequencialmente para evitar excesso de conexões
   * externas simultâneas.
   */
  for (
    const pagina
    of paginasSelecionadas
  ) {
    const resumo =
      obterResultadoProvedor(
        resultadosPorProvedor,
        pagina.provedor
      )

    resumo.encontradas++

    const resultado =
      await inspecionarPaginaVaga(
        pagina
      )

    if (
      "erro" in resultado
    ) {
      resumo.falhas++

      falhas++

      registrarPendencia(
        pendencias,
        {
          tipo:
            "acesso",

          provedor:
            pagina.provedor,

          titulo:
            pagina.titulo,

          url:
            pagina.url,

          localizacao:
            null,

          motivo:
            resultado.erro
        }
      )

      continue
    }

    if (
      !resultado.vaga ||
      !resultado.ehPublicacaoVaga
    ) {
      resumo.ignoradas++

      const indisponivel =
        paginaEstaIndisponivel(
          resultado.urlFinal,
          resultado.codigoStatus
        )

      registrarPendencia(
        pendencias,
        {
          tipo:
            indisponivel
              ? "indisponivel"
              : "extracao",

          provedor:
            pagina.provedor,

          titulo:
            pagina.titulo,

          url:
            resultado.urlFinal,

          localizacao:
            null,

          motivo:
            indisponivel
              ? "A publicação não está mais disponível no ATS."
              : "A página foi acessada, mas nenhum extrator conseguiu confirmar uma vaga válida."
        }
      )

      continue
    }

    resumo.vagasValidas++

    vagasExtraidas++

    const elegibilidade =
      resultado.elegibilidadeBrasil

    if (
      !elegibilidade ||
      elegibilidade.situacao ===
      "indefinida"
    ) {
      resumo.indefinidas++

      indefinidas++

      registrarPendencia(
        pendencias,
        {
          tipo:
            "localizacao",

          provedor:
            resultado.provedor,

          titulo:
            resultado.vaga
              .titulo ??
            pagina.titulo,

          url:
            resultado.urlFinal,

          localizacao:
            resultado.vaga
              .localizacao,

          motivo:
            elegibilidade
              ?.motivo ??
            "A elegibilidade para o Brasil não foi avaliada."
        }
      )

      continue
    }

    if (
      elegibilidade.situacao ===
      "incompativel"
    ) {
      resumo
        .incompativeisBrasil++

      incompativeisBrasil++

      continue
    }

    resumo.compativeisBrasil++

    compativeisBrasil++

    /**
     * Durante o diagnóstico eu paro aqui.
     *
     * A vaga já foi validada, mas não faço qualquer alteração no banco.
     */
    if (
      !salvarCompativeis
    ) {
      continue
    }

    const novaVaga =
      converterVagaWebParaNovaVaga(
        pagina,
        resultado.vaga,
        resultado.urlFinal
      )

    if (!novaVaga) {
      resumo
        .semDadosObrigatorios++

      semDadosObrigatorios++

      continue
    }

    try {
      await criarVaga(
        novaVaga
      )

      resumo.importadas++

      importadas++
    } catch (erro) {
      if (
        ehErroVagaDuplicada(
          erro
        )
      ) {
        resumo.duplicadas++

        duplicadas++

        continue
      }

      throw erro
    }
  }

  return {
    paginasDescobertas:
      paginas.length,

    descartadasPorTitulo,

    paginasDeListagem,

    paginasSelecionadas:
      paginasSelecionadas.length,

    paginasSomenteDescoberta:
      somenteDescoberta.length,

    vagasExtraidas,

    compativeisBrasil,

    incompativeisBrasil,

    indefinidas,

    importadas,

    duplicadas,

    semDadosObrigatorios,

    falhas,

    porProvedor: [
      ...resultadosPorProvedor
        .values()
    ],

    pendencias,

    somenteDescoberta,

    recomendacoesDescoberta
  }
}