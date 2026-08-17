import type { CursoProfissional } from "../../types/perfil-profissional.js"

import { normalizarTexto, possuiPeriodo } from "./documento-curriculo.js"

import type { DocumentoCurriculo } from "./documento-curriculo.js"

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

export function extrairCursos(documento: DocumentoCurriculo): CursoProfissional[] {
  const resultado: CursoProfissional[] = []

  const linhasCursos = documento.secoes.cursos

  if (linhasCursos.length > 0) {
    for (const linha of linhasCursos) {
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
