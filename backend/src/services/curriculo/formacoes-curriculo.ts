import type { FormacaoProfissional } from "../../types/perfil-profissional.js"

import {
  TERMOS_INSTITUICAO,
  contemAlgumTermo,
  dividirCamposFortes,
  ehContato,
  extrairPeriodo,
  normalizarTexto,
  pareceFraseDescritiva,
  pareceSomentePeriodo,
  possuiPeriodo
} from "./documento-curriculo.js"

import type {
  DocumentoCurriculo,
  ItemPontuado,
  LinhaDocumento,
  LinhaPontuada
} from "./documento-curriculo.js"

type CandidatoFormacao = {
  inicio: number
  fimCabecalho: number
  curso: string
  instituicao: string
  nivel: string
  periodo: string
  confianca: number
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

export function pontuarCursoAcademico(texto: string) {
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

export function extrairFormacoes(documento: DocumentoCurriculo): FormacaoProfissional[] {
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
