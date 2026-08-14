import {
  perfilBusca
} from "../config/search-profile.js"

import type {
  PerfilProfissional
} from "../types/perfil-profissional.js"

import type {
  JobMatch as CorrespondenciaVaga,
  StoredJob as VagaArmazenada
} from "../types/job.js"

type FamiliaFormacao = {
  nome: string

  termosPerfil: string[]

  termosVaga: string[]
}

/**
 * Eu utilizo estes termos somente quando a descrição realmente parece
 * estar falando de um requisito acadêmico.
 *
 * Isso reduz falsos positivos causados por tecnologias ou palavras que
 * aparecem na vaga fora do contexto de formação.
 */
const MARCADORES_FORMACAO = [
  "formacao",
  "graduacao",
  "ensino superior",
  "curso superior",
  "superior completo",
  "superior em",
  "bacharelado",
  "tecnologo",
  "degree",
  "bachelor",
  "graduation",
  "education"
]

/**
 * Eu considero cursos da mesma família de TI como formações relacionadas.
 *
 * Assim uma formação em Análise e Desenvolvimento de Sistemas também
 * atende uma vaga que aceite Ciência da Computação, Sistemas de
 * Informação, Engenharia de Software ou áreas equivalentes.
 */
const FAMILIAS_FORMACAO:
  FamiliaFormacao[] = [
    {
      nome:
        "Tecnologia da Informação",

      termosPerfil: [
        "analise e desenvolvimento de sistemas",
        "ads",
        "sistemas de informacao",
        "ciencia da computacao",
        "engenharia de software",
        "engenharia da computacao",
        "tecnologia da informacao",
        "gestao de tecnologia da informacao",
        "gestao da tecnologia da informacao",
        "redes de computadores",
        "banco de dados",
        "computer science",
        "information systems",
        "software engineering",
        "computer engineering",
        "information technology",
        "systems analysis and development"
      ],

      termosVaga: [
        "analise e desenvolvimento de sistemas",
        "ads",
        "sistemas de informacao",
        "ciencia da computacao",
        "engenharia de software",
        "engenharia da computacao",
        "tecnologia da informacao",
        "gestao de tecnologia da informacao",
        "gestao da tecnologia da informacao",
        "redes de computadores",
        "banco de dados",
        "computer science",
        "information systems",
        "software engineering",
        "computer engineering",
        "information technology",
        "systems analysis and development"
      ]
    }
  ]

/**
 * Eu começo com o perfil definido no código para manter o fallback atual.
 *
 * Quando existir um perfil salvo no PostgreSQL, o serviço responsável
 * pelo perfil substituirá este conteúdo em memória.
 */
function criarPerfilPadraoMatcher():
  PerfilProfissional {
  return {
    resumoProfissional:
      "",

    cargosPrincipais: [
      ...perfilBusca
        .cargosPrincipais
    ],

    cargosRelacionados: [
      ...perfilBusca
        .cargosRelacionados
    ],

    cargosDesvio: [
      ...perfilBusca
        .cargosDesvio
    ],

    competencias:
      perfilBusca
        .competencias
        .map(
          competencia => ({
            nome:
              competencia.nome,

            termos: [
              ...competencia.termos
            ]
          })
        ),

    experiencias:
      [],

    formacoes:
      [],

    cursos:
      [],

    localizacoesAceitas: [
      ...perfilBusca
        .localizacoesAceitas
    ],

    titulosExcluidos: [
      ...perfilBusca
        .titulosExcluidos
    ]
  }
}

let perfilProfissionalAtivo =
  criarPerfilPadraoMatcher()

/**
 * Eu mantenho uma cópia independente do perfil em memória.
 *
 * Dessa forma o matcher consegue utilizar também experiências, formação
 * e cursos sem depender de consultas ao PostgreSQL a cada vaga.
 */
export function definirPerfilProfissionalAtivo(
  perfil:
    PerfilProfissional
) {
  perfilProfissionalAtivo = {
    ...perfil,

    cargosPrincipais: [
      ...perfil.cargosPrincipais
    ],

    cargosRelacionados: [
      ...perfil.cargosRelacionados
    ],

    cargosDesvio: [
      ...perfil.cargosDesvio
    ],

    competencias:
      perfil.competencias.map(
        competencia => ({
          nome:
            competencia.nome,

          termos: [
            ...competencia.termos
          ]
        })
      ),

    experiencias:
      perfil.experiencias.map(
        experiencia => ({
          ...experiencia
        })
      ),

    formacoes:
      perfil.formacoes.map(
        formacao => ({
          ...formacao
        })
      ),

    cursos:
      perfil.cursos.map(
        curso => ({
          ...curso
        })
      ),

    localizacoesAceitas: [
      ...perfil.localizacoesAceitas
    ],

    titulosExcluidos: [
      ...perfil.titulosExcluidos
    ]
  }
}

/**
 * Normalizo também pontuação e caracteres especiais para comparar
 * expressões como TCP/IP, Node.js e palavras acentuadas uniformemente.
 */
function normalizarTexto(
  valor:
    string
) {
  return valor
    .normalize(
      "NFD"
    )
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

/**
 * Retiro HTML antes de analisar a descrição.
 */
function removerHtml(
  valor:
    string
) {
  return valor
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
}

/**
 * Procuro expressões completas para evitar reconhecer termos curtos
 * dentro de palavras sem relação.
 */
function contemExpressao(
  texto:
    string,

  termo:
    string
) {
  const textoNormalizado =
    ` ${normalizarTexto(
      texto
    )} `

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

function contemAlgum(
  texto:
    string,

  termos:
    string[]
) {
  return termos.some(
    termo =>
      contemExpressao(
        texto,
        termo
      )
  )
}

function encontrarCargos(
  titulo:
    string,

  cargos:
    string[]
) {
  return cargos.filter(
    cargo =>
      contemExpressao(
        titulo,
        cargo
      )
  )
}

/**
 * Eu encontro competências por conceito para continuar evitando que
 * sinônimos da mesma tecnologia sejam contados várias vezes.
 */
function encontrarCompetencias(
  texto:
    string,

  perfil =
    perfilProfissionalAtivo
) {
  return perfil
    .competencias
    .filter(
      competencia =>
        competencia
          .termos
          .some(
            termo =>
              contemExpressao(
                texto,
                termo
              )
          )
    )
    .map(
      competencia =>
        competencia.nome
    )
}

function localizacaoEhCompativel(
  localizacao:
    string,

  perfil =
    perfilProfissionalAtivo
) {
  if (!localizacao) {
    return true
  }

  if (
    contemAlgum(
      localizacao,
      perfil.localizacoesAceitas
    )
  ) {
    return true
  }

  return (
    localizacao ===
      "remote" ||
    localizacao ===
      "remoto" ||
    localizacao ===
      "remota"
  )
}

/**
 * O cargo continua sendo o principal sinal de aderência.
 */
function pontuarCargo(
  titulo:
    string,

  motivos:
    string[],

  perfil =
    perfilProfissionalAtivo
) {
  const cargosPrincipais =
    encontrarCargos(
      titulo,
      perfil.cargosPrincipais
    )

  if (
    cargosPrincipais.length >
    0
  ) {
    motivos.push(
      "Cargo diretamente relacionado ao perfil"
    )

    return {
      pontos:
        60,

      aderente:
        true,

      principal:
        true
    }
  }

  const cargosRelacionados =
    encontrarCargos(
      titulo,
      perfil.cargosRelacionados
    )

  if (
    cargosRelacionados.length >
    0
  ) {
    motivos.push(
      "Cargo relacionado a uma área complementar do perfil"
    )

    return {
      pontos:
        45,

      aderente:
        true,

      principal:
        false
    }
  }

  return {
    pontos:
      0,

    aderente:
      false,

    principal:
      false
  }
}

/**
 * Eu separo a identificação do desvio da penalização porque isso também
 * será utilizado para impedir que formação acadêmica transforme uma
 * vaga de desenvolvimento em uma recomendação indevida.
 */
function calcularDesvioProfissional(
  titulo:
    string,

  cargoAderente:
    boolean,

  motivos:
    string[],

  perfil =
    perfilProfissionalAtivo
) {
  const identificado =
    !cargoAderente &&
    contemAlgum(
      titulo,
      perfil.cargosDesvio
    )

  if (identificado) {
    motivos.push(
      "Cargo pertence a uma trilha profissional diferente da busca principal"
    )
  }

  return {
    pontos:
      identificado
        ? 20
        : 0,

    identificado
  }
}

function pontuarCompetencias(
  quantidade:
    number,

  cargoAderente:
    boolean
) {
  if (cargoAderente) {
    return Math.min(
      quantidade * 4,
      20
    )
  }

  return Math.min(
    quantidade * 2,
    16
  )
}

/**
 * Eu verifico primeiro se a vaga parece estar falando de requisito
 * acadêmico.
 *
 * Depois comparo tanto o curso exato quanto cursos pertencentes à mesma
 * família profissional.
 */
function avaliarFormacao(
  textoVaga:
    string,

  motivos:
    string[],

  perfil =
    perfilProfissionalAtivo
) {
  if (
    perfil.formacoes.length ===
      0 ||
    !contemAlgum(
      textoVaga,
      MARCADORES_FORMACAO
    )
  ) {
    return {
      pontos:
        0,

      compativel:
        false
    }
  }

  for (
    const formacao
    of perfil.formacoes
  ) {
    if (!formacao.curso) {
      continue
    }

    /**
     * Primeiro priorizo uma correspondência exata com o curso
     * cadastrado no perfil.
     */
    if (
      contemExpressao(
        textoVaga,
        formacao.curso
      )
    ) {
      motivos.push(
        `Formação acadêmica compatível: ${formacao.curso}`
      )

      return {
        pontos:
          8,

        compativel:
          true
      }
    }

    /**
     * Depois verifico equivalência entre cursos da mesma família.
     */
    for (
      const familia
      of FAMILIAS_FORMACAO
    ) {
      const perfilPertence =
        contemAlgum(
          formacao.curso,
          familia.termosPerfil
        )

      const vagaAceita =
        contemAlgum(
          textoVaga,
          familia.termosVaga
        )

      if (
        perfilPertence &&
        vagaAceita
      ) {
        motivos.push(
          `Formação acadêmica compatível com requisito de ${familia.nome}`
        )

        return {
          pontos:
            8,

          compativel:
            true
        }
      }
    }
  }

  return {
    pontos:
      0,

    compativel:
      false
  }
}

/**
 * Eu considero experiência profissional quando as competências exigidas
 * pela vaga também aparecem dentro das experiências cadastradas.
 *
 * Também reconheço quando já exerci um cargo da mesma família da vaga.
 */
function avaliarExperiencia(
  tituloVaga:
    string,

  competenciasVaga:
    string[],

  motivos:
    string[],

  perfil =
    perfilProfissionalAtivo
) {
  if (
    perfil.experiencias.length ===
    0
  ) {
    return 0
  }

  const textoExperiencias =
    perfil.experiencias
      .map(
        experiencia =>
          `${experiencia.cargo} ${experiencia.descricao}`
      )
      .join(
        " "
      )

  const competenciasExperiencia =
    encontrarCompetencias(
      textoExperiencias,
      perfil
    )

  const compartilhadas =
    competenciasVaga.filter(
      competencia =>
        competenciasExperiencia.includes(
          competencia
        )
    )

  /**
   * As competências comprovadas pela experiência podem acrescentar até
   * seis pontos.
   */
  let pontos =
    Math.min(
      compartilhadas.length *
        2,
      6
    )

  const cargosConhecidos = [
    ...perfil.cargosPrincipais,
    ...perfil.cargosRelacionados
  ]

  const possuiCargoRelacionado =
    perfil.experiencias.some(
      experiencia =>
        cargosConhecidos.some(
          cargo =>
            contemExpressao(
              tituloVaga,
              cargo
            ) &&
            contemExpressao(
              experiencia.cargo,
              cargo
            )
        )
    )

  if (
    possuiCargoRelacionado
  ) {
    pontos +=
      2
  }

  pontos =
    Math.min(
      pontos,
      8
    )

  if (
    pontos >
    0
  ) {
    motivos.push(
      "Experiência profissional relacionada aos requisitos da vaga"
    )
  }

  return pontos
}

/**
 * Cursos e certificações possuem um peso menor que formação acadêmica e
 * experiência.
 *
 * Eu considero o nome exato do curso ou uma competência reconhecida
 * dentro dele.
 */
function avaliarCursos(
  textoVaga:
    string,

  competenciasVaga:
    string[],

  motivos:
    string[],

  perfil =
    perfilProfissionalAtivo
) {
  const cursosRelacionados =
    perfil.cursos.filter(
      curso => {
        if (!curso.nome) {
          return false
        }

        if (
          contemExpressao(
            textoVaga,
            curso.nome
          )
        ) {
          return true
        }

        const competenciasCurso =
          encontrarCompetencias(
            curso.nome,
            perfil
          )

        return competenciasCurso.some(
          competencia =>
            competenciasVaga.includes(
              competencia
            )
        )
      }
    )

  const pontos =
    Math.min(
      cursosRelacionados.length *
        2,
      6
    )

  if (
    pontos >
    0
  ) {
    motivos.push(
      `${cursosRelacionados.length} curso(s) ou certificação(ões) relacionado(s)`
    )
  }

  return pontos
}

/**
 * Eu avalio a vaga utilizando todo o perfil profissional disponível.
 */
export function matchJob(
  vaga:
    VagaArmazenada
): CorrespondenciaVaga {
  const perfil =
    perfilProfissionalAtivo

  const titulo =
    normalizarTexto(
      vaga.title
    )

  const localizacao =
    normalizarTexto(
      vaga.location ??
        ""
    )

  const descricao =
    normalizarTexto(
      removerHtml(
        vaga.description
      )
    )

  const motivos:
    string[] = []

  if (
    contemAlgum(
      titulo,
      perfil.titulosExcluidos
    )
  ) {
    return {
      job:
        vaga,

      score:
        0,

      matchedSkills:
        [],

      reasons: [
        "Cargo fora da senioridade ou do tipo de vaga buscado"
      ]
    }
  }

  if (
    !localizacaoEhCompativel(
      localizacao,
      perfil
    )
  ) {
    return {
      job:
        vaga,

      score:
        0,

      matchedSkills:
        [],

      reasons: [
        "Localização não compatível com a busca"
      ]
    }
  }

  let pontuacao =
    0

  const resultadoCargo =
    pontuarCargo(
      titulo,
      motivos,
      perfil
    )

  pontuacao +=
    resultadoCargo.pontos

  if (vaga.remote) {
    pontuacao +=
      10

    motivos.push(
      "Vaga remota"
    )
  }

  pontuacao +=
    10

  motivos.push(
    "Localização compatível"
  )

  const textoPesquisavel =
    `${titulo} ${descricao}`

  const competenciasEncontradas =
    encontrarCompetencias(
      textoPesquisavel,
      perfil
    )

  pontuacao +=
    pontuarCompetencias(
      competenciasEncontradas.length,
      resultadoCargo.aderente
    )

  if (
    competenciasEncontradas.length >
    0
  ) {
    motivos.push(
      `${competenciasEncontradas.length} competência(s) relacionada(s)`
    )
  }

  /**
   * Formação pode acrescentar oito pontos e também permitir que uma vaga
   * com nomenclatura de cargo ainda desconhecida seja apresentada.
   */
  const resultadoFormacao =
    avaliarFormacao(
      textoPesquisavel,
      motivos,
      perfil
    )

  pontuacao +=
    resultadoFormacao.pontos

  pontuacao +=
    avaliarExperiencia(
      titulo,
      competenciasEncontradas,
      motivos,
      perfil
    )

  pontuacao +=
    avaliarCursos(
      textoPesquisavel,
      competenciasEncontradas,
      motivos,
      perfil
    )

  const resultadoDesvio =
    calcularDesvioProfissional(
      titulo,
      resultadoCargo.aderente,
      motivos,
      perfil
    )

  pontuacao -=
    resultadoDesvio.pontos

  /**
   * Continuo protegendo contra carreiras explicitamente classificadas
   * como outra trilha.
   *
   * Porém, se o título simplesmente ainda não estiver cadastrado e a
   * vaga exigir uma formação que eu possuo, permito que ela chegue ao
   * corte mínimo de relevância.
   */
  if (
    !resultadoCargo.aderente
  ) {
    if (
      resultadoDesvio.identificado
    ) {
      pontuacao =
        Math.min(
          pontuacao,
          55
        )
    } else if (
      resultadoFormacao.compativel
    ) {
      pontuacao =
        Math.max(
          pontuacao,
          60
        )
    } else {
      pontuacao =
        Math.min(
          pontuacao,
          55
        )
    }
  }

  return {
    job:
      vaga,

    score:
      Math.max(
        0,
        Math.min(
          pontuacao,
          100
        )
      ),

    matchedSkills:
      competenciasEncontradas,

    reasons:
      motivos
  }
}