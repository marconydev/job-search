import type { PerfilProfissional } from "../../types/perfil-profissional.js"

import type { ResultadoImportacaoCurriculo } from "../../types/importacao-curriculo.js"

import { contemTermo, ehContato, possuiPeriodo, prepararDocumento } from "./documento-curriculo.js"

import type { DocumentoCurriculo } from "./documento-curriculo.js"

import { extrairExperiencias } from "./experiencias-curriculo.js"

import { extrairFormacoes, pontuarCursoAcademico } from "./formacoes-curriculo.js"

import { extrairCursos } from "./cursos-curriculo.js"

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

function extrairResumo(documento: DocumentoCurriculo) {
  const resumo = documento.secoes.resumo

  if (resumo.length > 0) {
    return resumo
      .map(linha => linha.texto)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
  }

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
