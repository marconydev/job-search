import type { PerfilProfissional } from "../types/perfil-profissional.js"
import type { JobMatch as CorrespondenciaVaga, StoredJob as VagaArmazenada } from "../types/job.js"

import { avaliarElegibilidadeBrasil } from "./elegibilidade-localizacao.js"
import { avaliarPoliticaVagaBrasil } from "./politica-vagas-brasil.js"

type FamiliaFormacao = { nome: string; termosPerfil: string[]; termosVaga: string[] }

const MARCADORES_FORMACAO = [
  "formacao", "graduacao", "ensino superior", "curso superior",
  "superior completo", "superior em", "bacharelado", "tecnologo",
  "degree", "bachelor", "graduation", "education"
]

const FAMILIAS_FORMACAO: FamiliaFormacao[] = [
  {
    nome: "Tecnologia da Informação",
    termosPerfil: [
      "analise e desenvolvimento de sistemas", "ads",
      "sistemas de informacao", "ciencia da computacao",
      "engenharia de software", "engenharia da computacao",
      "tecnologia da informacao", "gestao de tecnologia da informacao",
      "redes de computadores", "banco de dados",
      "computer science", "information systems", "software engineering",
      "computer engineering", "information technology",
      "systems analysis and development"
    ],
    termosVaga: [
      "analise e desenvolvimento de sistemas", "ads",
      "sistemas de informacao", "ciencia da computacao",
      "engenharia de software", "engenharia da computacao",
      "tecnologia da informacao", "gestao de tecnologia da informacao",
      "redes de computadores", "banco de dados",
      "computer science", "information systems", "software engineering",
      "computer engineering", "information technology",
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
  const t = ` ${normalizarTexto(texto)} `
  const x = normalizarTexto(termo)
  if (!x) return false
  return t.includes(` ${x} `)
}

function contemAlgum(texto: string, termos: string[]) {
  return termos.some(termo => contemExpressao(texto, termo))
}

function encontrarCargos(titulo: string, cargos: string[]) {
  return cargos.filter(cargo => contemExpressao(titulo, cargo))
}

function encontrarCompetencias(texto: string, perfil: PerfilProfissional) {
  return perfil.competencias
    .filter(c => c.termos.some(t => contemExpressao(texto, t)))
    .map(c => c.nome)
}

function pontuarCargo(titulo: string, motivos: string[], perfil: PerfilProfissional) {
  const principais = encontrarCargos(titulo, perfil.cargosPrincipais)
  if (principais.length > 0) {
    motivos.push("Cargo diretamente relacionado ao perfil")
    return { pontos: 60, aderente: true, principal: true }
  }
  const relacionados = encontrarCargos(titulo, perfil.cargosRelacionados)
  if (relacionados.length > 0) {
    motivos.push("Cargo relacionado a uma área complementar do perfil")
    return { pontos: 45, aderente: true, principal: false }
  }
  return { pontos: 0, aderente: false, principal: false }
}

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
  return { pontos: identificado ? 20 : 0, identificado }
}

function pontuarCompetencias(quantidade: number, cargoAderente: boolean) {
  if (cargoAderente) return Math.min(quantidade * 4, 20)
  return Math.min(quantidade * 2, 16)
}

function avaliarFormacao(textoVaga: string, motivos: string[], perfil: PerfilProfissional) {
  if (perfil.formacoes.length === 0 || !contemAlgum(textoVaga, MARCADORES_FORMACAO)) {
    return { pontos: 0, compativel: false }
  }
  for (const formacao of perfil.formacoes) {
    if (!formacao.curso) continue
    if (contemExpressao(textoVaga, formacao.curso)) {
      motivos.push(`Formação acadêmica compatível: ${formacao.curso}`)
      return { pontos: 8, compativel: true }
    }
    for (const familia of FAMILIAS_FORMACAO) {
      const perfilPertence = contemAlgum(formacao.curso, familia.termosPerfil)
      const vagaAceita = contemAlgum(textoVaga, familia.termosVaga)
      if (perfilPertence && vagaAceita) {
        motivos.push(`Formação acadêmica compatível com requisito de ${familia.nome}`)
        return { pontos: 8, compativel: true }
      }
    }
  }
  return { pontos: 0, compativel: false }
}

function avaliarExperiencia(
  tituloVaga: string,
  competenciasVaga: string[],
  motivos: string[],
  perfil: PerfilProfissional
) {
  if (perfil.experiencias.length === 0) return 0
  const textoExperiencias = perfil.experiencias
    .map(e => `${e.cargo} ${e.descricao}`)
    .join(" ")
  const comps = encontrarCompetencias(textoExperiencias, perfil)
  const compartilhadas = competenciasVaga.filter(c => comps.includes(c))
  let pontos = Math.min(compartilhadas.length * 2, 6)
  const cargosConhecidos = [...perfil.cargosPrincipais, ...perfil.cargosRelacionados]
  const possui = perfil.experiencias.some(exp =>
    cargosConhecidos.some(c =>
      contemExpressao(tituloVaga, c) && contemExpressao(exp.cargo, c)
    )
  )
  if (possui) pontos += 2
  pontos = Math.min(pontos, 8)
  if (pontos > 0) motivos.push("Experiência profissional relacionada aos requisitos da vaga")
  return pontos
}

function avaliarCursos(
  textoVaga: string,
  competenciasVaga: string[],
  motivos: string[],
  perfil: PerfilProfissional
) {
  const relacionados = perfil.cursos.filter(curso => {
    if (!curso.nome) return false
    if (contemExpressao(textoVaga, curso.nome)) return true
    const comps = encontrarCompetencias(curso.nome, perfil)
    return comps.some(c => competenciasVaga.includes(c))
  })
  const pontos = Math.min(relacionados.length * 2, 6)
  if (pontos > 0) motivos.push(`${relacionados.length} curso(s) ou certificação(ões) relacionado(s)`)
  return pontos
}

export function matchJob(vaga: VagaArmazenada, perfil: PerfilProfissional): CorrespondenciaVaga {
  const titulo = normalizarTexto(vaga.title)
  const descricao = normalizarTexto(removerHtml(vaga.description))
  const motivos: string[] = []

  if (contemAlgum(titulo, perfil.titulosExcluidos)) {
    return { job: vaga, score: 0, matchedSkills: [], reasons: [
      "Cargo fora da senioridade ou do tipo de vaga buscado"
    ]}
  }

  const elegibilidade = avaliarElegibilidadeBrasil(
    vaga.location,
    vaga.description,
    vaga.title,
    vaga.remote,
    perfil.localizacoesAceitas
  )

  if (elegibilidade.situacao === "incompativel") {
    return { job: vaga, score: 0, matchedSkills: [], reasons: [elegibilidade.motivo] }
  }

  // A política não veta mais por geografia (M3).
  // O retorno pode trazer um desconto por título fora do foco em português (M4).
  const politica = avaliarPoliticaVagaBrasil({
    title: vaga.title,
    location: vaga.location,
    remote: vaga.remote,
    workplaceType: ((vaga as { workplace_type?: string }).workplace_type ?? undefined) as
      | "remote"
      | "hybrid"
      | "on-site"
      | "unknown"
      | undefined
  })

  let pontuacao = 0

  const resultadoCargo = pontuarCargo(titulo, motivos, perfil)

  if (!resultadoCargo.aderente) {
    const desvio = calcularDesvioProfissional(titulo, false, motivos, perfil)
    if (!desvio.identificado) {
      motivos.push("Cargo não corresponde às famílias profissionais configuradas no perfil")
    }
    return { job: vaga, score: 0, matchedSkills: [], reasons: motivos }
  }

  pontuacao += resultadoCargo.pontos

  if (vaga.remote) {
    pontuacao += 10
    motivos.push("Vaga remota")
  }

  if (elegibilidade.situacao === "compativel") {
    pontuacao += 10
    motivos.push("Localização compatível")
  } else {
    motivos.push("Localização ainda não confirmada; vaga mantida para análise")
  }

  const texto = `${titulo} ${descricao}`
  const competencias = encontrarCompetencias(texto, perfil)

  pontuacao += pontuarCompetencias(competencias.length, resultadoCargo.aderente)
  if (competencias.length > 0) motivos.push(`${competencias.length} competência(s) relacionada(s)`)

  pontuacao += avaliarFormacao(texto, motivos, perfil).pontos
  pontuacao += avaliarExperiencia(titulo, competencias, motivos, perfil)
  pontuacao += avaliarCursos(texto, competencias, motivos, perfil)

  if (politica.desconto > 0) {
    pontuacao -= politica.desconto
    motivos.push(`Título fora do foco em português: -${politica.desconto} ponto(s)`)
  }

  return {
    job: vaga,
    score: Math.max(0, Math.min(pontuacao, 100)),
    matchedSkills: competencias,
    reasons: motivos
  }
}
