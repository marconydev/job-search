import { createHash } from "node:crypto"

import { perfilBusca } from "../config/search-profile.js"

import { descobrirPaginasVagas } from "./job-discovery.js"
import { converterVagaWebParaNovaVaga } from "./conversao-vaga-web.js"
import { inspecionarPaginaVaga } from "../discovery/page-inspector.js"
import { matchJob as avaliarVaga } from "./job-matcher.js"

import {
  createJob as criarVaga,
  findJobBySourceExternalId as buscarVagaPorOrigemEIdExterno,
  isDuplicateJobError as ehErroVagaDuplicada
} from "../repositories/job-repository.js"

import {
  saveJobMatch as salvarCorrespondenciaVaga
} from "../repositories/job-match-repository.js"

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
  ResultadoPersistenciaDescoberta,
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
   * Informo quantas novas chamadas esta execução deseja solicitar.
   *
   * O limite diário definitivo continua sendo controlado pelo serviço
   * de descoberta.
   */
  limiteChamadasBrave?: number
}

/**
 * Estes provedores já possuem uma estratégia de extração estruturada
 * implementada no projeto.
 *
 * LinkedIn, Indeed, agregadores e outras fontes continuam sendo úteis,
 * mas inicialmente trabalho com os dados disponíveis na descoberta.
 */
const provedoresProcessaveis = new Set<ProvedorPagina>([
  "gupy",
  "lever",
  "greenhouse",
  "workable",
  "smartrecruiters"
])

/**
 * Mantenho alguns termos adicionais porque nem todas as empresas usam
 * exatamente os mesmos títulos definidos no meu perfil de busca.
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

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function contemExpressao(
  texto: string,
  termo: string
) {
  const textoNormalizado =
    ` ${normalizarTexto(texto)} `

  const termoNormalizado =
    normalizarTexto(termo)

  if (!termoNormalizado) {
    return false
  }

  return textoNormalizado.includes(
    ` ${termoNormalizado} `
  )
}

/**
 * Faço uma triagem inicial usando o título e a descrição curta que já
 * vieram da descoberta.
 *
 * Não considero esta etapa como decisão definitiva. Meu objetivo aqui
 * é somente evitar processamento desnecessário de páginas claramente
 * fora do perfil.
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
    ...perfilBusca.cargosPrincipais,
    ...perfilBusca.cargosRelacionados,
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
   * Alguns anúncios possuem títulos menos padronizados.
   *
   * Nestes casos mantenho a página quando encontro um indicador
   * profissional acompanhado de pelo menos duas competências do perfil.
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

  return competencias.length >= 2
}

/**
 * Identifico páginas de listagem e pesquisa.
 *
 * Quero priorizar URLs que representem uma oportunidade individual,
 * principalmente quando estou trabalhando com plataformas de vagas.
 */
function paginaEhListagem(
  pagina: PaginaClassificada
) {
  try {
    const url = new URL(
      pagina.url
    )

    const caminho =
      url.pathname.toLowerCase()

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
          partes[1] ?? ""
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

      return partes.length < 2
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
 * Algumas URLs da Workable terminam em /apply/.
 *
 * Para a inspeção estruturada preciso trabalhar com a página principal
 * da oportunidade.
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
      url: url.toString()
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
        .get("not_found") ===
        "true" ||
      urlAnalisada
        .searchParams
        .get("error") ===
        "true"
    )
  } catch {
    return false
  }
}

/**
 * Elimino conteúdos claramente informativos que podem aparecer nas
 * buscas por utilizarem os mesmos termos técnicos das vagas.
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
   * Comparativos de software são uma fonte comum de falso positivo.
   *
   * Um artigo sobre "Best Service Desk Software", por exemplo, contém
   * exatamente o nome de um cargo que procuro, mas não representa vaga.
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
      urlAnalisada
        .hostname
        .toLowerCase()

    const caminho =
      urlAnalisada
        .pathname
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
 * Por isso só considero sinais que vieram da própria oportunidade.
 * Não uso a consulta que fiz à Brave como evidência.
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
      url.hostname.toLowerCase()

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
    // Se não consegui interpretar a URL, continuo pela análise do texto.
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
 * No Indeed considero o domínio brasileiro um sinal válido para esta
 * etapa inicial de triagem.
 */
function indeedEhBrasileiro(
  pagina:
    PaginaSomenteDescoberta
) {
  try {
    const hostname =
      new URL(
        pagina.url
      )
        .hostname
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
 * Verifico se a própria oportunidade possui algum sinal de Brasil.
 *
 * Não utilizo pagina.consulta porque ela representa aquilo que eu pedi
 * ao mecanismo de busca, e não uma informação fornecida pela vaga.
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
      )
        .hostname
        .toLowerCase()
  } catch {
    hostname = ""
  }

  /**
   * Um domínio brasileiro é um sinal inicial forte o suficiente para
   * continuar a avaliação.
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
 * Só marco uma oportunidade como remota quando encontro uma expressão
 * que realmente descreve a modalidade de trabalho.
 *
 * Não considero uma ocorrência isolada da palavra "remoto", porque uma
 * descrição pode dizer "prestar suporte remoto aos usuários" mesmo que
 * a vaga seja presencial.
 */
function detectarTrabalhoRemoto(
  pagina:
    PaginaSomenteDescoberta
) {
  const titulo =
    pagina.titulo

  const descricao =
    pagina.descricao ?? ""

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
 * Uso o mesmo matcher principal do projeto para avaliar páginas que
 * ainda possuem somente título e descrição curta.
 *
 * Assim não preciso manter dois algoritmos diferentes de pontuação.
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
   * Crio esta vaga apenas em memória para conseguir reutilizar o matcher.
   *
   * Como já identifiquei um sinal brasileiro acima, uso "Brasil" como
   * localização temporária durante a pontuação. Na persistência parcial
   * não invento uma cidade ou estado e salvo a localização como nula.
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
      pagina.descricao ?? "",

    location:
      "Brasil",

    remote:
      remoto,

    url:
      pagina.url,

    published_at:
      null,

    partial:
      true,

    created_at:
      new Date(0)
        .toISOString()
  }

  const correspondencia =
    avaliarVaga(
      vagaTemporaria
    )

  if (
    correspondencia.score < 60
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
 * Produzo um ranking local das páginas que ainda não possuem extração
 * estruturada.
 *
 * Esta operação não realiza nenhuma nova chamada externa.
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
        recomendacao !== null
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
 * Crio um identificador curto e previsível a partir da URL.
 *
 * Não uso a URL inteira em external_id porque esta coluna possui limite
 * de tamanho no PostgreSQL e algumas plataformas geram endereços longos.
 *
 * Como o hash sempre será o mesmo para a mesma URL, consigo deduplicar a
 * oportunidade nas execuções futuras.
 */
function criarIdExternoDescoberta(
  recomendacao:
    RecomendacaoDescoberta
) {
  const hash =
    createHash("sha256")
      .update(
        recomendacao.url
      )
      .digest("hex")
      .slice(0, 48)

  return `web_${hash}`
}

/**
 * Tento identificar a empresa usando padrões que aparecem com frequência
 * nos títulos retornados pelos mecanismos de busca.
 *
 * Prefiro deixar a empresa como não identificada quando não tenho
 * segurança em vez de salvar um nome incorreto.
 */
function identificarEmpresaDescoberta(
  recomendacao:
    RecomendacaoDescoberta
) {
  const titulo =
    recomendacao.titulo
      .trim()

  const padroes = [
    /^A empresa (.+?) está contratando/i,

    /^(.+?) hiring /i,

    /[-–—]\s*(.+?)\s*[-–—]\s*Vaga\b/i,

    /\s[-–—]\s*Vaga\s*[-–—]\s*(.+)$/i,

    /\s[-–—]\s*([^|]+?)\s*\|\s*BeBee$/i
  ]

  for (
    const padrao
    of padroes
  ) {
    const resultado =
      titulo.match(
        padrao
      )

    const empresa =
      resultado?.[1]
        ?.trim()

    if (
      empresa &&
      empresa.length >= 2 &&
      empresa.length <= 150
    ) {
      return empresa
    }
  }

  return "Empresa não identificada"
}

/**
 * Monto uma descrição mínima quando o mecanismo de busca não retornou
 * um snippet.
 *
 * Deixo explícito no banco que este registro veio da descoberta para
 * não confundir com uma descrição completa extraída do anúncio.
 */
function obterDescricaoDescoberta(
  recomendacao:
    RecomendacaoDescoberta
) {
  const descricao =
    recomendacao.descricao
      ?.trim()

  if (descricao) {
    return descricao
  }

  return (
    "Descrição ainda não disponível. " +
    "Esta oportunidade foi registrada a partir da descoberta da vaga."
  )
}

/**
 * Crio um objeto vazio para facilitar os caminhos em que a persistência
 * está desativada, como acontece no diagnóstico.
 */
function criarResultadoPersistenciaVazio():
  ResultadoPersistenciaDescoberta {
  return {
    novas: 0,
    atualizadas: 0,
    falhas: 0
  }
}

/**
 * Salvo no PostgreSQL as recomendações que antes existiam apenas no
 * resultado da descoberta.
 *
 * Desta forma LinkedIn, Indeed, Catho, InfoJobs, Talent.com, BeBee e
 * outras fontes também passam a alimentar o dashboard.
 *
 * Uso partial=true porque não possuo necessariamente todos os dados da
 * publicação original.
 */
async function persistirRecomendacoesDescoberta(
  recomendacoes:
    RecomendacaoDescoberta[]
): Promise<
  ResultadoPersistenciaDescoberta
> {
  const resultado =
    criarResultadoPersistenciaVazio()

  for (
    const recomendacao
    of recomendacoes
  ) {
    try {
      const idExterno =
        criarIdExternoDescoberta(
          recomendacao
        )

      let vaga =
        await buscarVagaPorOrigemEIdExterno(
          recomendacao.provedor,
          idExterno
        )

      let criadaAgora =
        false

      if (!vaga) {
        try {
          vaga =
            await criarVaga({
              source:
                recomendacao.provedor,

              externalId:
                idExterno,

              company:
                identificarEmpresaDescoberta(
                  recomendacao
                ),

              title:
                recomendacao.titulo,

              description:
                obterDescricaoDescoberta(
                  recomendacao
                ),

              /**
               * Sei que a recomendação passou pelo filtro de Brasil, mas
               * não invento cidade ou estado quando o dado não veio de
               * forma estruturada.
               */
              location:
                null,

              remote:
                detectarTrabalhoRemoto(
                  recomendacao
                ),

              url:
                recomendacao.url,

              publishedAt:
                null,

              partial:
                true
            })

          criadaAgora =
            true
        } catch (erro) {
          /**
           * Mesmo trabalhando sequencialmente, mantenho esta proteção
           * porque a vaga pode ter sido criada por outra execução entre
           * a consulta e o INSERT.
           */
          if (
            !ehErroVagaDuplicada(
              erro
            )
          ) {
            throw erro
          }

          vaga =
            await buscarVagaPorOrigemEIdExterno(
              recomendacao.provedor,
              idExterno
            )

          if (!vaga) {
            throw new Error(
              "A vaga foi identificada como duplicada, mas não consegui recuperá-la do banco."
            )
          }
        }
      }

      /**
       * Salvo diretamente o score que já foi calculado pelo matcher.
       *
       * O repositório preserva decisões manuais como viewed, applied e
       * ignored caso esta oportunidade já tenha sido tratada no dashboard.
       */
      await salvarCorrespondenciaVaga({
        jobId:
          vaga.id,

        localScore:
          recomendacao.pontuacao,

        matchedSkills:
          recomendacao.competencias,

        reasons:
          recomendacao.motivos,

        status:
          "relevant"
      })

      if (criadaAgora) {
        resultado.novas++
      } else {
        resultado.atualizadas++
      }
    } catch (erro) {
      resultado.falhas++

      /**
       * Uma falha individual não precisa interromper toda a sincronização.
       * Registro o problema e continuo processando as demais oportunidades.
       */
      console.error(
        `Erro ao persistir descoberta "${recomendacao.titulo}":`,
        erro
      )
    }
  }

  return resultado
}

/**
 * Executo descoberta, triagem, extração, avaliação geográfica e,
 * opcionalmente, persistência.
 *
 * Também devolvo as oportunidades provenientes das páginas que ainda não
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
   * Quando permitirBuscaLive não está ativo, o serviço de descoberta
   * trabalha somente com o conteúdo disponível no cache.
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
   * Somente os provedores que possuem extratores validados são abertos
   * para processamento estruturado.
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
   * Não descarto as demais fontes.
   *
   * Elas permanecem disponíveis para classificação pelo matcher usando
   * os dados que a descoberta já trouxe.
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

  const recomendacoesDescoberta =
    criarRecomendacoesDescoberta(
      somenteDescoberta
    )

  /**
   * No diagnóstico salvarCompativeis é false.
   *
   * Isso garante que npm run diagnose continue sendo uma operação de
   * leitura e análise, sem alterar jobs ou job_matches.
   */
  const persistenciaDescoberta =
    salvarCompativeis
      ? await persistirRecomendacoesDescoberta(
          recomendacoesDescoberta
        )
      : criarResultadoPersistenciaVazio()

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
   * Processo as páginas estruturadas sequencialmente.
   *
   * Prefiro evitar várias conexões simultâneas contra os ATS e manter a
   * execução mais previsível.
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
     * Durante o diagnóstico paro aqui.
     *
     * A vaga já foi validada, mas não faço alteração no banco.
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

    persistenciaDescoberta,

    porProvedor: [
      ...resultadosPorProvedor
        .values()
    ],

    pendencias,

    somenteDescoberta,

    recomendacoesDescoberta
  }
}