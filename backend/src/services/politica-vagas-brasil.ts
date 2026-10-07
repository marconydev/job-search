import { PENALIDADE_TITULO_FORA_FOCO } from "../config/matcher.js"

import type { WorkplaceType } from "../types/job.js"

type DadosVaga = {
  title: string
  location: string | null
  remote: boolean
  workplaceType?: WorkplaceType | null
}

export type ResultadoPoliticaVaga = {
  permitida: boolean
  motivo: string | null
  desconto: number
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function contemExpressao(texto: string, termo: string) {
  const normalizado = ` ${normalizarTexto(texto)} `
  const termoNormalizado = normalizarTexto(termo)
  if (!termoNormalizado) return false
  return normalizado.includes(` ${termoNormalizado} `)
}

const MARCADORES_TITULO_BRASIL = [
  "analista", "suporte", "tecnico", "tecnica", "sistemas",
  "infraestrutura", "implantacao", "implementacao", "processos",
  "dados", "negocios", "redes", "monitoramento", "administrador",
  "administradora", "consultor", "consultora", "especialista",
  "coordenador", "coordenadora", "supervisor", "supervisora",
  "assistente", "atendimento", "operacoes", "operacao",
  "service desk", "help desk", "noc"
]

export function tituloEstaNoFocoBrasil(titulo: string) {
  return MARCADORES_TITULO_BRASIL.some(marcador => contemExpressao(titulo, marcador))
}

const UFS_BRASIL = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
]

const ESTADOS_BRASIL_POR_EXTENSO = [
  "acre","alagoas","amapa","amazonas","bahia","ceara",
  "distrito federal","espirito santo","goias","maranhao",
  "mato grosso","mato grosso do sul","minas gerais","para",
  "paraiba","parana","pernambuco","piaui","rio de janeiro",
  "rio grande do norte","rio grande do sul","rondonia","roraima",
  "santa catarina","sao paulo","sergipe","tocantins"
]

const LOCALIZACOES_GENERICAS = [
  "brasil","brazil","latam","latin america","south america",
  "americas","worldwide","anywhere","global","remote","remoto",
  "remota","home office","anywhere in brazil","100 remote"
]

const INDICADORES_REMOTO = [
  "remote","remoto","remota","home office","work from home","100 remote"
]

function ehLocalizacaoGenerica(location: string | null): boolean {
  if (!location) return true
  const normalizado = normalizarTexto(location)
  if (!normalizado) return true

  // Removo cada termo genérico (como palavra inteira) e vejo se sobra
  // alguma coisa. Se sobrar, é cidade específica.
  let restante = normalizado
  for (const g of LOCALIZACOES_GENERICAS) {
    restante = restante.replace(new RegExp("\\b" + g + "\\b", "g"), "")
  }
  restante = restante.replace(/\s+/g, " ").trim()
  return restante === ""
}

function contemUfBrasileira(location: string): boolean {
  const texto = location
  return UFS_BRASIL.some(uf => {
    const re = new RegExp(`(^|[\\s,;/|()\\-–—])${uf}($|[\\s,;/|()\\-–—])`)
    return re.test(texto)
  })
}

function contemEstadoExtenso(location: string): boolean {
  const normalizado = normalizarTexto(location)
  return ESTADOS_BRASIL_POR_EXTENSO.some(e => normalizado.includes(e))
}

function localizacaoPareceCidadeEspecifica(location: string | null): boolean {
  if (!location) return false
  if (ehLocalizacaoGenerica(location)) return false
  if (contemUfBrasileira(location)) return true
  if (contemEstadoExtenso(location)) return true
  return false
}

export function vagaEstaEmJoaoPessoa(vaga: Pick<DadosVaga, "location">) {
  const local = vaga.location ?? ""
  return (
    contemExpressao(local, "joao pessoa") ||
    contemExpressao(local, "campina grande") ||
    contemExpressao(local, "paraiba") ||
    contemExpressao(local, "pb")
  )
}

function modalidadeEfetiva(vaga: DadosVaga): WorkplaceType {
  if (vaga.workplaceType === "on-site") return "on-site"
  if (vaga.workplaceType === "hybrid") return "hybrid"
  if (vaga.workplaceType === "remote") return "remote"

  // Fonte não informou. Tenta inferir.
  const local = vaga.location ?? ""
  const localNormalizado = normalizarTexto(local)
  if (INDICADORES_REMOTO.some(t => localNormalizado.includes(t))) return "remote"

  // Cidade/UF brasileira específica (não genérica) → tratar como on-site
  if (localizacaoPareceCidadeEspecifica(local)) return "on-site"

  // Localização genérica (Brasil, LATAM, etc) → unknown
  return "unknown"
}

export function avaliarPoliticaVagaBrasil(vaga: DadosVaga): ResultadoPoliticaVaga {
  const noFoco = tituloEstaNoFocoBrasil(vaga.title)
  const desconto = noFoco ? 0 : PENALIDADE_TITULO_FORA_FOCO
  const modalidade = modalidadeEfetiva(vaga)

  if (modalidade === "on-site" && !vagaEstaEmJoaoPessoa(vaga)) {
    return {
      permitida: false,
      motivo: "Vaga presencial fora de João Pessoa/PB.",
      desconto
    }
  }

  return { permitida: true, motivo: null, desconto }
}
