import type {
  ExperienciaProfissional,
  PerfilProfissional
} from "../../types/perfil-profissional.js"

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

type CandidatoExperiencia = {
  inicio: number
  fimCabecalho: number
  cargo: string
  empresa: string
  periodo: string
  confianca: number
}

const TERMOS_CARGO = [
  "analista",
  "analyst",
  "coordenador",
  "coordenadora",
  "coordinator",
  "gerente",
  "manager",
  "especialista",
  "specialist",
  "assistente",
  "assistant",
  "tecnico",
  "technician",
  "suporte",
  "support",
  "administrador",
  "administrator",
  "engenheiro",
  "engineer",
  "desenvolvedor",
  "developer",
  "programador",
  "programmer",
  "consultor",
  "consultant",
  "arquiteto",
  "architect",
  "supervisor",
  "lider",
  "lead",
  "head",
  "estagiario",
  "intern",
  "infraestrutura",
  "infrastructure",
  "redes",
  "network",
  "sistemas",
  "systems",
  "dados",
  "data",
  "service desk",
  "help desk",
  "helpdesk",
  "customer success",
  "noc"
]

const TERMOS_EMPRESA = [
  "ltda",
  "s a",
  "inc",
  "corp",
  "corporation",
  "company",
  "empresa",
  "grupo",
  "group",
  "hospital",
  "clinica",
  "clinic",
  "banco",
  "bank",
  "telecom",
  "tecnologia",
  "technology",
  "solutions",
  "solucoes",
  "servicos",
  "services"
]

function pontuarCargo(texto: string, perfil: PerfilProfissional) {
  if (!texto || ehContato(texto) || pareceSomentePeriodo(texto)) {
    return -20
  }

  let pontos = 0

  const cargosPerfil = [
    ...perfil.cargosPrincipais,
    ...perfil.cargosRelacionados,
    ...perfil.experiencias.map(experiencia => experiencia.cargo)
  ]
    .map(cargo => cargo.trim())
    .filter(Boolean)

  if (contemAlgumTermo(texto, cargosPerfil)) {
    pontos += 8
  }

  if (contemAlgumTermo(texto, TERMOS_CARGO)) {
    pontos += 5
  }

  const quantidadePalavras = texto.split(/\s+/).filter(Boolean).length

  if (quantidadePalavras >= 1 && quantidadePalavras <= 10) {
    pontos += 2
  }

  if (contemAlgumTermo(texto, TERMOS_INSTITUICAO)) {
    pontos -= 5
  }

  if (pareceFraseDescritiva(texto)) {
    pontos -= 5
  }

  return pontos
}

function pontuarEmpresa(texto: string, perfil: PerfilProfissional) {
  if (!texto || ehContato(texto) || pareceSomentePeriodo(texto)) {
    return -20
  }

  let pontos = 0

  const quantidadePalavras = texto.split(/\s+/).filter(Boolean).length

  if (quantidadePalavras >= 1 && quantidadePalavras <= 12) {
    pontos += 3
  }

  if (contemAlgumTermo(texto, TERMOS_EMPRESA)) {
    pontos += 4
  }

  if (pontuarCargo(texto, perfil) >= 6) {
    pontos -= 6
  }

  if (pareceFraseDescritiva(texto)) {
    pontos -= 5
  }

  return pontos
}

function analisarExperienciaUmaLinha(
  linha: LinhaDocumento,
  perfil: PerfilProfissional
): CandidatoExperiencia | null {
  if (!possuiPeriodo(linha.texto)) {
    return null
  }

  const campos = dividirCamposFortes(linha.texto)

  if (campos.length < 2) {
    return null
  }

  const camposPeriodo = campos.filter(campo => possuiPeriodo(campo))

  const camposTexto = campos.filter(campo => !possuiPeriodo(campo))

  if (camposTexto.length === 0) {
    return null
  }

  const cargos: ItemPontuado[] = camposTexto
    .map(texto => ({
      texto,
      pontos: pontuarCargo(texto, perfil)
    }))
    .sort((a, b) => b.pontos - a.pontos)

  const melhorCargo = cargos[0]

  if (!melhorCargo || melhorCargo.pontos < 3) {
    return null
  }

  const empresas: ItemPontuado[] = camposTexto
    .filter(texto => texto !== melhorCargo.texto)
    .map(texto => ({
      texto,
      pontos: pontuarEmpresa(texto, perfil)
    }))
    .sort((a, b) => b.pontos - a.pontos)

  const melhorEmpresa = empresas[0]

  const periodo = camposPeriodo.length > 0 ? camposPeriodo.join(" - ") : extrairPeriodo(linha.texto)

  return {
    inicio: linha.ordem,

    fimCabecalho: linha.ordem,

    cargo: melhorCargo.texto,

    empresa: melhorEmpresa && melhorEmpresa.pontos >= 0 ? melhorEmpresa.texto : "",

    periodo,

    confianca:
      melhorCargo.pontos +
      Math.max(melhorEmpresa?.pontos ?? 0, 0) +
      (linha.secao === "experiencias" ? 4 : 0)
  }
}

function analisarExperienciaMultilinha(
  linhas: LinhaDocumento[],
  posicaoData: number,
  perfil: PerfilProfissional,
  secaoConfiavel: boolean
): CandidatoExperiencia | null {
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

  const cargos: LinhaPontuada[] = contexto
    .map(linha => ({
      linha,
      pontos: pontuarCargo(linha.texto, perfil)
    }))
    .sort((a, b) => b.pontos - a.pontos)

  const melhorCargo = cargos[0]

  const minimoCargo = secaoConfiavel ? 2 : 6

  if (!melhorCargo || melhorCargo.pontos < minimoCargo) {
    return null
  }

  const empresas: LinhaPontuada[] = contexto
    .filter(linha => linha.ordem !== melhorCargo.linha.ordem)
    .map(linha => ({
      linha,
      pontos: pontuarEmpresa(linha.texto, perfil)
    }))
    .sort((a, b) => b.pontos - a.pontos)

  const melhorEmpresa = empresas[0]

  const ordensCabecalho = [linhaData.ordem, melhorCargo.linha.ordem]

  if (melhorEmpresa && melhorEmpresa.pontos >= 0) {
    ordensCabecalho.push(melhorEmpresa.linha.ordem)
  }

  return {
    inicio: Math.min(...ordensCabecalho),

    fimCabecalho: Math.max(...ordensCabecalho),

    cargo: melhorCargo.linha.texto,

    empresa: melhorEmpresa && melhorEmpresa.pontos >= 0 ? melhorEmpresa.linha.texto : "",

    periodo: linhaData.texto,

    confianca:
      melhorCargo.pontos + Math.max(melhorEmpresa?.pontos ?? 0, 0) + (secaoConfiavel ? 4 : 0)
  }
}

function deduplicarExperiencias(candidatos: CandidatoExperiencia[]) {
  const resultado: CandidatoExperiencia[] = []

  const ordenados = [...candidatos].sort((a, b) => a.inicio - b.inicio || b.confianca - a.confianca)

  for (const candidato of ordenados) {
    const duplicado = resultado.some(existente => {
      const mesmoCargo = normalizarTexto(existente.cargo) === normalizarTexto(candidato.cargo)

      const mesmoPeriodo = normalizarTexto(existente.periodo) === normalizarTexto(candidato.periodo)

      const mesmaRegiao = Math.abs(existente.inicio - candidato.inicio) <= 1

      return (mesmoCargo && mesmoPeriodo) || (mesmoPeriodo && mesmaRegiao)
    })

    if (!duplicado) {
      resultado.push(candidato)
    }
  }

  return resultado
}

export function extrairExperiencias(
  documento: DocumentoCurriculo,
  perfil: PerfilProfissional
): ExperienciaProfissional[] {
  const secaoExplicita = documento.secoes.experiencias.length > 0

  const linhas = secaoExplicita ? documento.secoes.experiencias : documento.linhas

  const candidatos: CandidatoExperiencia[] = []

  for (let posicao = 0; posicao < linhas.length; posicao++) {
    const linha = linhas[posicao]

    if (!linha) {
      continue
    }

    const umaLinha = analisarExperienciaUmaLinha(linha, perfil)

    if (umaLinha && umaLinha.confianca >= (secaoExplicita ? 6 : 10)) {
      candidatos.push(umaLinha)

      continue
    }

    if (!possuiPeriodo(linha.texto)) {
      continue
    }

    const multilinha = analisarExperienciaMultilinha(linhas, posicao, perfil, secaoExplicita)

    if (multilinha && multilinha.confianca >= (secaoExplicita ? 6 : 11)) {
      candidatos.push(multilinha)
    }
  }

  const unicos = deduplicarExperiencias(candidatos)

  return unicos
    .map((candidato, indice): ExperienciaProfissional => {
      const proximo = unicos[indice + 1]

      const limite = proximo ? proximo.inicio : Number.POSITIVE_INFINITY

      const descricao = linhas
        .filter(linha => linha.ordem > candidato.fimCabecalho && linha.ordem < limite)
        .filter(linha => !possuiPeriodo(linha.texto))
        .filter(linha => linha.texto !== candidato.cargo && linha.texto !== candidato.empresa)
        .map(linha => linha.texto)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()

      return {
        empresa: candidato.empresa,

        cargo: candidato.cargo,

        periodo: candidato.periodo,

        descricao
      }
    })
    .filter(experiencia => Boolean(experiencia.cargo))
    .slice(0, 20)
}
