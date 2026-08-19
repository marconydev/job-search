import type { PerfilProfissional } from "../types/perfil-profissional.js"

import type { JobMatch as CorrespondenciaVaga, StoredJob as VagaArmazenada } from "../types/job.js"

import { avaliarElegibilidadeBrasil } from "./elegibilidade-localizacao.js"

type FamiliaFormacao = {
  nome: string

  termosPerfil: string[]

  termosVaga: string[]
}

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

const FAMILIAS_FORMACAO: FamiliaFormacao[] = [
  {
    nome: "Tecnologia da Informação",

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

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function removerHtml(valor: string) {
  return valor
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function contemExpressao(texto: string, termo: string) {
  const textoNormalizado = ` ${normalizarTexto(texto)} `

  const termoNormalizado = normalizarTexto(termo)

  if (!termoNormalizado) {
    return false
  }

  return textoNormalizado.includes(` ${termoNormalizado} `)
}

function contemAlgum(texto: string, termos: string[]) {
  return termos.some(termo => contemExpressao(texto, termo))
}

function encontrarCargos(titulo: string, cargos: string[]) {
  return cargos.filter(cargo => contemExpressao(titulo, cargo))
}

function encontrarCompetencias(texto: string, perfil: PerfilProfissional) {
  return perfil.competencias
    .filter(competencia => competencia.termos.some(termo => contemExpressao(texto, termo)))
    .map(competencia => competencia.nome)
}

/**
 * O cargo continua sendo o principal sinal de aderência.
 */
function pontuarCargo(titulo: string, motivos: string[], perfil: PerfilProfissional) {
  const cargosPrincipais = encontrarCargos(titulo, perfil.cargosPrincipais)

  if (cargosPrincipais.length > 0) {
    motivos.push("Cargo diretamente relacionado ao perfil")

    return {
      pontos: 60,
      aderente: true,
      principal: true
    }
  }

  const cargosRelacionados = encontrarCargos(titulo, perfil.cargosRelacionados)

  if (cargosRelacionados.length > 0) {
    motivos.push("Cargo relacionado a uma área complementar do perfil")

    return {
      pontos: 45,
      aderente: true,
      principal: false
    }
  }

  return {
    pontos: 0,
    aderente: false,
    principal: false
  }
}

/**
 * Identifico separadamente cargos pertencentes a outra trilha para
 * impedir que competências ou formação elevem indevidamente o score.
 */
function calcularDesvioProfissional(
  titulo: string,
  cargoAderente: boolean,
  motivos: string[],
  perfil: PerfilProfissional
) {
  const identificado = !cargoAderente && contemAlgum(titulo, perfil.cargosDesvio)

  if (identificado) {
    motivos.push("Cargo pertence a uma trilha profissional diferente da busca principal")
  }

  return {
    pontos: identificado ? 20 : 0,

    identificado
  }
}

function pontuarCompetencias(quantidade: number, cargoAderente: boolean) {
  if (cargoAderente) {
    return Math.min(quantidade * 4, 20)
  }

  return Math.min(quantidade * 2, 16)
}

function avaliarFormacao(textoVaga: string, motivos: string[], perfil: PerfilProfissional) {
  if (perfil.formacoes.length === 0 || !contemAlgum(textoVaga, MARCADORES_FORMACAO)) {
    return {
      pontos: 0,
      compativel: false
    }
  }

  for (const formacao of perfil.formacoes) {
    if (!formacao.curso) {
      continue
    }

    if (contemExpressao(textoVaga, formacao.curso)) {
      motivos.push(`Formação acadêmica compatível: ${formacao.curso}`)

      return {
        pontos: 8,
        compativel: true
      }
    }

    for (const familia of FAMILIAS_FORMACAO) {
      const perfilPertence = contemAlgum(formacao.curso, familia.termosPerfil)

      const vagaAceita = contemAlgum(textoVaga, familia.termosVaga)

      if (perfilPertence && vagaAceita) {
        motivos.push(`Formação acadêmica compatível com requisito de ${familia.nome}`)

        return {
          pontos: 8,
          compativel: true
        }
      }
    }
  }

  return {
    pontos: 0,
    compativel: false
  }
}

function avaliarExperiencia(
  tituloVaga: string,
  competenciasVaga: string[],
  motivos: string[],
  perfil: PerfilProfissional
) {
  if (perfil.experiencias.length === 0) {
    return 0
  }

  const textoExperiencias = perfil.experiencias
    .map(experiencia => `${experiencia.cargo} ${experiencia.descricao}`)
    .join(" ")

  const competenciasExperiencia = encontrarCompetencias(textoExperiencias, perfil)

  const compartilhadas = competenciasVaga.filter(competencia =>
    competenciasExperiencia.includes(competencia)
  )

  let pontos = Math.min(compartilhadas.length * 2, 6)

  const cargosConhecidos = [...perfil.cargosPrincipais, ...perfil.cargosRelacionados]

  const possuiCargoRelacionado = perfil.experiencias.some(experiencia =>
    cargosConhecidos.some(
      cargo => contemExpressao(tituloVaga, cargo) && contemExpressao(experiencia.cargo, cargo)
    )
  )

  if (possuiCargoRelacionado) {
    pontos += 2
  }

  pontos = Math.min(pontos, 8)

  if (pontos > 0) {
    motivos.push("Experiência profissional relacionada aos requisitos da vaga")
  }

  return pontos
}

function avaliarCursos(
  textoVaga: string,
  competenciasVaga: string[],
  motivos: string[],
  perfil: PerfilProfissional
) {
  const cursosRelacionados = perfil.cursos.filter(curso => {
    if (!curso.nome) {
      return false
    }

    if (contemExpressao(textoVaga, curso.nome)) {
      return true
    }

    const competenciasCurso = encontrarCompetencias(curso.nome, perfil)

    return competenciasCurso.some(competencia => competenciasVaga.includes(competencia))
  })

  const pontos = Math.min(cursosRelacionados.length * 2, 6)

  if (pontos > 0) {
    motivos.push(`${cursosRelacionados.length} curso(s) ou certificação(ões) relacionado(s)`)
  }

  return pontos
}

/**
 * O matcher recebe tudo que precisa por parâmetro.
 *
 * O perfil padrão é usado apenas como fallback para chamadas legadas
 * enquanto os demais fluxos são migrados para fornecer o perfil salvo
 * explicitamente.
 */
export function matchJob(vaga: VagaArmazenada, perfil: PerfilProfissional): CorrespondenciaVaga {
  const titulo = normalizarTexto(vaga.title)

  const descricao = normalizarTexto(removerHtml(vaga.description))

  const motivos: string[] = []

  if (contemAlgum(titulo, perfil.titulosExcluidos)) {
    return {
      job: vaga,
      score: 0,
      matchedSkills: [],
      reasons: ["Cargo fora da senioridade ou do tipo de vaga buscado"]
    }
  }

  const elegibilidade = avaliarElegibilidadeBrasil(vaga.location, vaga.description, vaga.title)

  if (elegibilidade.situacao !== "compativel") {
    return {
      job: vaga,
      score: 0,
      matchedSkills: [],
      reasons: [elegibilidade.motivo]
    }
  }

  let pontuacao = 0

  const resultadoCargo = pontuarCargo(titulo, motivos, perfil)

  /**
   * Formação, cursos e tecnologias só refinam o score de uma vaga cujo
   * título pertence a uma família profissional configurada no perfil.
   * Eles não podem transformar SEO, marketing, tradução ou outro cargo
   * incompatível em oportunidade aderente.
   */
  if (!resultadoCargo.aderente) {
    const resultadoDesvio = calcularDesvioProfissional(titulo, false, motivos, perfil)

    if (!resultadoDesvio.identificado) {
      motivos.push("Cargo não corresponde às famílias profissionais configuradas no perfil")
    }

    return {
      job: vaga,
      score: 0,
      matchedSkills: [],
      reasons: motivos
    }
  }

  pontuacao += resultadoCargo.pontos

  if (vaga.remote) {
    pontuacao += 10

    motivos.push("Vaga remota")
  }

  pontuacao += 10

  motivos.push("Localização compatível")

  const textoPesquisavel = `${titulo} ${descricao}`

  const competenciasEncontradas = encontrarCompetencias(textoPesquisavel, perfil)

  pontuacao += pontuarCompetencias(competenciasEncontradas.length, resultadoCargo.aderente)

  if (competenciasEncontradas.length > 0) {
    motivos.push(`${competenciasEncontradas.length} competência(s) relacionada(s)`)
  }

  const resultadoFormacao = avaliarFormacao(textoPesquisavel, motivos, perfil)

  pontuacao += resultadoFormacao.pontos

  pontuacao += avaliarExperiencia(titulo, competenciasEncontradas, motivos, perfil)

  pontuacao += avaliarCursos(textoPesquisavel, competenciasEncontradas, motivos, perfil)

  return {
    job: vaga,

    score: Math.max(0, Math.min(pontuacao, 100)),

    matchedSkills: competenciasEncontradas,

    reasons: motivos
  }
}
