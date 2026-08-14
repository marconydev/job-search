import { perfilBusca } from "../config/search-profile.js"

import {
  buscarPerfilProfissionalSalvo,
  salvarPerfilProfissionalNoBanco
} from "../repositories/perfil-profissional-repository.js"

import { definirPerfilProfissionalAtivo } from "./job-matcher.js"

import type {
  CompetenciaPerfil,
  CursoProfissional,
  ExperienciaProfissional,
  FormacaoProfissional,
  PerfilProfissional
} from "../types/perfil-profissional.js"

/**
 * Eu mantenho o arquivo search-profile.ts como configuração inicial.
 *
 * Depois do primeiro salvamento, o PostgreSQL passa a ser a fonte
 * principal do meu perfil profissional.
 */
function criarPerfilPadrao(): PerfilProfissional {
  return {
    resumoProfissional: "",

    cargosPrincipais: [...perfilBusca.cargosPrincipais],

    cargosRelacionados: [...perfilBusca.cargosRelacionados],

    cargosDesvio: [...perfilBusca.cargosDesvio],

    competencias: perfilBusca.competencias.map(competencia => ({
      nome: competencia.nome,

      termos: [...competencia.termos]
    })),

    experiencias: [],

    formacoes: [],

    cursos: [],

    localizacoesAceitas: [...perfilBusca.localizacoesAceitas],

    titulosExcluidos: [...perfilBusca.titulosExcluidos]
  }
}

function normalizarTexto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : ""
}

function normalizarLista(valor: unknown) {
  if (!Array.isArray(valor)) {
    return []
  }

  return [
    ...new Set(
      valor
        .filter(item => typeof item === "string")
        .map(item => item.trim())
        .filter(Boolean)
    )
  ]
}

function normalizarCompetencias(valor: unknown): CompetenciaPerfil[] {
  if (!Array.isArray(valor)) {
    return []
  }

  return valor
    .map(item => {
      if (!item || typeof item !== "object") {
        return null
      }

      const registro = item as Record<string, unknown>

      const nome = normalizarTexto(registro.nome)

      if (!nome) {
        return null
      }

      return {
        nome,

        termos: normalizarLista(registro.termos)
      }
    })
    .filter((item): item is CompetenciaPerfil => item !== null)
}

function normalizarExperiencias(valor: unknown): ExperienciaProfissional[] {
  if (!Array.isArray(valor)) {
    return []
  }

  return valor
    .map(item => {
      if (!item || typeof item !== "object") {
        return null
      }

      const registro = item as Record<string, unknown>

      const empresa = normalizarTexto(registro.empresa)

      const cargo = normalizarTexto(registro.cargo)

      if (!empresa && !cargo) {
        return null
      }

      return {
        empresa,

        cargo,

        periodo: normalizarTexto(registro.periodo),

        descricao: normalizarTexto(registro.descricao)
      }
    })
    .filter((item): item is ExperienciaProfissional => item !== null)
}

function normalizarFormacoes(valor: unknown): FormacaoProfissional[] {
  if (!Array.isArray(valor)) {
    return []
  }

  return valor
    .map(item => {
      if (!item || typeof item !== "object") {
        return null
      }

      const registro = item as Record<string, unknown>

      const instituicao = normalizarTexto(registro.instituicao)

      const curso = normalizarTexto(registro.curso)

      if (!instituicao && !curso) {
        return null
      }

      return {
        instituicao,

        curso,

        nivel: normalizarTexto(registro.nivel),

        periodo: normalizarTexto(registro.periodo)
      }
    })
    .filter((item): item is FormacaoProfissional => item !== null)
}

function normalizarCursos(valor: unknown): CursoProfissional[] {
  if (!Array.isArray(valor)) {
    return []
  }

  return valor
    .map(item => {
      if (!item || typeof item !== "object") {
        return null
      }

      const registro = item as Record<string, unknown>

      const nome = normalizarTexto(registro.nome)

      if (!nome) {
        return null
      }

      return {
        nome,

        instituicao: normalizarTexto(registro.instituicao),

        ano: normalizarTexto(registro.ano)
      }
    })
    .filter((item): item is CursoProfissional => item !== null)
}

/**
 * Eu valido e normalizo tudo que chega da interface antes de salvar.
 */
export function normalizarPerfilProfissional(valor: unknown): PerfilProfissional {
  if (!valor || typeof valor !== "object") {
    throw new Error("Perfil profissional inválido")
  }

  const registro = valor as Record<string, unknown>

  return {
    resumoProfissional: normalizarTexto(registro.resumoProfissional),

    cargosPrincipais: normalizarLista(registro.cargosPrincipais),

    cargosRelacionados: normalizarLista(registro.cargosRelacionados),

    cargosDesvio: normalizarLista(registro.cargosDesvio),

    competencias: normalizarCompetencias(registro.competencias),

    experiencias: normalizarExperiencias(registro.experiencias),

    formacoes: normalizarFormacoes(registro.formacoes),

    cursos: normalizarCursos(registro.cursos),

    localizacoesAceitas: normalizarLista(registro.localizacoesAceitas),

    titulosExcluidos: normalizarLista(registro.titulosExcluidos)
  }
}

/**
 * Eu retorno o perfil salvo ou, enquanto ele ainda não existir, a
 * configuração inicial do projeto.
 */
export async function obterPerfilProfissional() {
  const salvo = await buscarPerfilProfissionalSalvo()

  if (salvo) {
    return salvo
  }

  return {
    perfil: criarPerfilPadrao(),

    nomeArquivoOrigem: null,

    atualizadoEm: null
  }
}

/**
 * Eu carrego o perfil do PostgreSQL para a memória utilizada pelo
 * matcher.
 */
export async function carregarPerfilProfissionalAtivo() {
  const dados = await obterPerfilProfissional()

  definirPerfilProfissionalAtivo(dados.perfil)

  return dados
}

/**
 * Quando salvo o perfil, ele passa a valer imediatamente para novas
 * análises sem precisar reiniciar o servidor.
 */
export async function salvarPerfilProfissional(
  valor: unknown,

  nomeArquivoOrigem: string | null = null
) {
  const perfil = normalizarPerfilProfissional(valor)

  const salvo = await salvarPerfilProfissionalNoBanco(perfil, nomeArquivoOrigem)

  definirPerfilProfissionalAtivo(salvo.perfil)

  return salvo
}
