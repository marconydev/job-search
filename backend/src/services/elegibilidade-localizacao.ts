import type { ResultadoElegibilidadeLocalizacao } from "../types/elegibilidade.js"

import {
  interpretarModalidadeEstruturada,
  type ModalidadeEstruturada
} from "./modalidade-vaga.js"

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function escaparRegex(valor: string) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function contemTermo(texto: string, termo: string) {
  const padrao = new RegExp(`(^|[^a-z0-9])${escaparRegex(termo)}([^a-z0-9]|$)`, "i")
  return padrao.test(texto)
}

function contemAlgumTermo(texto: string, termos: string[]) {
  return termos.some(termo => contemTermo(texto, termo))
}

/**
 * Região metropolitana oficial de João Pessoa (Opção A da diretiva).
 *
 * NÃO inclui "paraiba" nem "pb" sozinhos — senão "Campina Grande, PB"
 * e "Patos, PB" também casariam. Cidade da RMPJP tem que aparecer pelo
 * nome, ou a vaga cai em locIncompat.
 */
const regiaoMetropolitanaJoaoPessoa = [
  "joao pessoa",
  "jpa",
  "santa rita",
  "bayeux",
  "cabedelo",
  "conde",
  "lucena",
  "cruz do espirito santo",
  "sobrado",
  "caapora",
  "alhandra",
  "pitimbu",
  "mari",
  "sape",
  "riachao do poco",
  "sao miguel de taipu",
  "juripiranga",
  "pedras de fogo"
]

const localizacoesBrasil = [
  "brasil", "brazil",
  "acre", "alagoas", "amapa", "amazonas", "bahia", "ceara",
  "distrito federal", "espirito santo", "goias", "maranhao",
  "mato grosso", "mato grosso do sul", "minas gerais", "para",
  "paraiba", "parana", "pernambuco", "piaui", "rio de janeiro",
  "rio grande do norte", "rio grande do sul", "rondonia", "roraima",
  "santa catarina", "sao paulo", "sergipe", "tocantins",
  "joao pessoa", "campina grande", "recife", "fortaleza", "salvador",
  "campinas", "barueri", "osasco", "sao carlos", "ribeirao preto",
  "sorocaba", "belo horizonte", "uberlandia", "vitoria", "curitiba",
  "londrina", "maringa", "florianopolis", "blumenau", "joinville",
  "porto alegre", "caxias do sul", "brasilia", "goiania", "anapolis",
  "campo grande", "cuiaba"
]

const ufsBrasil = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
]

const estadosBrasilExtenso = [
  "acre","alagoas","amapa","amazonas","bahia","ceara",
  "distrito federal","espirito santo","goias","maranhao",
  "mato grosso","mato grosso do sul","minas gerais","para",
  "paraiba","parana","pernambuco","piaui","rio de janeiro",
  "rio grande do norte","rio grande do sul","rondonia","roraima",
  "santa catarina","sao paulo","sergipe","tocantins"
]

const localizacoesGenericas = [
  "brasil","brazil","latam","latin america","america latina",
  "south america","america do sul","americas","worldwide","anywhere",
  "global","world","remote","remoto","remota","home office",
  "100 remote","anywhere in brazil","internacional","international"
]

const exclusoesBrasil = [
  "except brazil","except brasil","excluding brazil","excluding brasil",
  "not available in brazil","not available in brasil",
  "cannot hire in brazil","cannot hire in brasil",
  "can't hire in brazil","can't hire in brasil",
  "nao contratamos no brasil","nao aceita candidatos do brasil"
]

const indicadoresRestricao = [
  "must be based in","must reside in","must be located in",
  "applicants must be based in","candidates must be based in",
  "only candidates in","only candidates located in",
  "legal right to work in","right to work in"
]

const indicadoresLocalizacaoBrasil = [
  "based in brazil","based in brasil","located in brazil","located in brasil",
  "location brazil","location brasil","work location brazil","work location brasil",
  "workplace brazil","workplace brasil","remote brazil","remote brasil",
  "brazil remote","brasil remote","brasil remoto","brasil remota",
  "remoto brasil","remota brasil","vaga remota brasil","vaga remota no brasil",
  "trabalho remoto brasil","trabalho remoto no brasil",
  "home office brazil","home office brasil"
]

const bandeirasEstrangeirasRemoto = [
  "united states","united states of america","usa","us","u.s.","u s","eua",
  "estados unidos","estados unidos da america","north america","america do norte",
  "canada","united kingdom","uk","gb","great britain","england","scotland","wales","u.k.","ireland","portugal","lisbon","lisboa",
  "spain","france","italy","germany","netherlands","poland","sweden","norway",
  "lithuania","lituania","serbia","servia","romania","hungary","croatia",
  "czech republic","czechia","estonia","latvia","south africa",
  "india","pakistan","australia","new zealand","japan","singapore",
  "united arab emirates","uae","qatar","greece","thessaloniki","hyderabad",
  "emea","europe","europa","european union","apac","asia","asia pacific",
  "latam","latin america","america latina","south america","america do sul",
  "americas","global","worldwide","anywhere","world",
  "internacional","international"
]

const SINAIS_REMOTO = [
  "remote","remoto","remota","home office","work from home","100 remote","fully remote"
]
const SINAIS_HIBRIDO = ["hibrido","hibrida","hybrid"]
const SINAIS_PRESENCIAL = ["presencial","on site","onsite"]

function localizacaoTemUfBrasileira(localizacao: string) {
  const texto = localizacao.trim()
  if (!texto) return false
  if (/^BR$/i.test(texto)) return true
  return ufsBrasil.some(uf => {
    const padrao = new RegExp(`(^|[\\s,;/|()\\-–—])${uf}($|[\\s,;/|()\\-–—])`)
    return padrao.test(texto)
  })
}

function tituloTemUfBrasileira(titulo: string) {
  const possuiContextoPortugues =
    /\b(analista|atendente|suporte|tecnico|técnico|sistemas|implantacao|implantação|infraestrutura|dados|monitoramento)\b/i.test(
      titulo
    )
  if (!possuiContextoPortugues) return false
  return ufsBrasil.some(uf => {
    const padrao = new RegExp(`(?:\\/|\\(|-|,\\s*)\\s*${uf}(?:\\)|\\b)`)
    return padrao.test(titulo)
  })
}

const SINAIS_FEDERAL = [
  "public trust",
  "security clearance",
  "top secret clearance",
  "u s department",
  "us department",
  "department of defense",
  "department of education",
  "federal agency",
  "federal contractor"
]

function descricaoIndicaRestricaoFederalEstrangeira(descricao: string) {
  return contemAlgumTermo(descricao, SINAIS_FEDERAL)
}

const padroesRestricaoPcdExplicita = [
  "vaga pcd",
  "vagas pcd",
  "vaga para pcd",
  "vagas para pcd",
  "vaga exclusiva pcd",
  "vagas exclusivas pcd",
  "vaga exclusiva para pcd",
  "vagas exclusivas para pcd",
  "vaga afirmativa pcd",
  "vagas afirmativas pcd",
  "vaga afirmativa para pcd",
  "vagas afirmativas para pcd"
]

const marcadoresPcd = [
  "pcd",
  "pcds",
  "pessoa com deficiencia",
  "pessoas com deficiencia",
  "portador de deficiencia",
  "portadora de deficiencia",
  "portadores de deficiencia",
  "cadeirante",
  "cadeirantes",
  "pne",
  "deficiencia"
]

const indicadoresRestricaoPcd = [
  "exclusiva", "exclusivo", "exclusivas", "exclusivos",
  "afirmativa", "afirmativo", "afirmativas", "afirmativos",
  "apenas", "somente",
  "reservada", "reservado", "reservadas", "reservados",
  "destinada", "destinado", "destinadas", "destinados",
  "direcionada", "direcionado", "direcionadas", "direcionados"
]

function buscarRestricaoPcdNaProximidade(textoNormalizado: string, janela = 100): boolean {
  for (const ind of indicadoresRestricaoPcd) {
    const re = new RegExp("(^|[^a-z0-9])" + escaparRegex(ind) + "(?![a-z0-9])", "gi")
    let m: RegExpExecArray | null
    while ((m = re.exec(textoNormalizado)) !== null) {
      const inicio = m.index + m[1].length
      const fim = m.index + m[0].length
      const antes = textoNormalizado.slice(Math.max(0, inicio - janela), inicio)
      const antesLimpo = antes.split(/[.!?\n]/).pop() ?? ""
      const depois = textoNormalizado.slice(fim, fim + janela)
      const depoisLimpo = depois.split(/[.!?\n]/)[0] ?? ""
      const janelaTexto = antesLimpo + " " + textoNormalizado.slice(inicio, fim) + " " + depoisLimpo
      if (contemAlgumTermo(janelaTexto, marcadoresPcd)) return true
    }
  }
  return false
}

function vagaExclusivaPcd(titulo: string | null, descricao: string | null): boolean {
  if (titulo) {
    const t = normalizarTexto(titulo)
    if (t) {
      if (contemAlgumTermo(t, padroesRestricaoPcdExplicita)) return true
      if (buscarRestricaoPcdNaProximidade(t)) return true
    }
  }
  if (descricao) {
    const d = normalizarTexto(descricao)
    if (d) {
      if (contemAlgumTermo(d, padroesRestricaoPcdExplicita)) return true
      const header = d.slice(0, 500)
      if (header && buscarRestricaoPcdNaProximidade(header)) return true
    }
  }
  return false
}

function descricaoRestringeParaOutroPais(descricao: string) {
  // Exige co-ocorrencia: o indicador de restricao e a bandeira estrangeira
  // precisam estar na MESMA janela de ate 100 chars. Sem isso, uma descricao
  // de multinacional ("U.S.-based company") + "Must reside in <cidade BR>"
  // dispara falso positivo (caso Curitiba, ids 3514/3523).
  for (const ind of indicadoresRestricao) {
    const re = new RegExp(escaparRegex(ind) + "[^.!?\\n]{0,100}", "gi")
    let m: RegExpExecArray | null
    while ((m = re.exec(descricao)) !== null) {
      if (contemAlgumTermo(m[0], bandeirasEstrangeirasRemoto)) return true
    }
  }
  return false
}

function descricaoIndicaLocalizacaoBrasil(descricao: string) {
  return contemAlgumTermo(descricao, indicadoresLocalizacaoBrasil)
}

function localizacaoNaRegiaoJoaoPessoa(localizacao: string | null) {
  if (!localizacao) return false
  const texto = normalizarTexto(localizacao)
  if (!texto) return false
  return contemAlgumTermo(texto, regiaoMetropolitanaJoaoPessoa)
}

function localizacaoBrasilConfirmada(localizacao: string | null) {
  if (!localizacao) return false
  const texto = normalizarTexto(localizacao)
  if (!texto) return false
  if (contemAlgumTermo(texto, localizacoesBrasil)) return true
  if (localizacaoTemUfBrasileira(localizacao)) return true
  return false
}

function localizacaoTemBandeiraEstrangeira(localizacao: string | null) {
  if (!localizacao) return false
  const texto = normalizarTexto(localizacao)
  if (!texto) return false
  return contemAlgumTermo(texto, bandeirasEstrangeirasRemoto)
}

/**
 * Heurística de "cidade específica brasileira".
 *
 * Remove genéricos + UFs + estados extensos e vê se sobra um nome de
 * cidade. Não distingue se a cidade é brasileira — é só o "restou algo".
 * Quem filtra estrangeiro é a chamadora (bandeira estrangeira vem antes).
 */
function ehLocalizacaoGenerica(normalizado: string) {
  let restante = normalizado
  for (const g of localizacoesGenericas) {
    restante = restante.replace(new RegExp(`\\b${escaparRegex(g)}\\b`, "g"), "")
  }
  restante = restante
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return restante === ""
}

function localizacaoPareceCidadeEspecifica(localizacao: string | null) {
  if (!localizacao) return false
  const normalizado = normalizarTexto(localizacao)
  if (!normalizado) return false

  if (ehLocalizacaoGenerica(normalizado)) return false
  if (localizacaoTemUfBrasileira(localizacao)) return true

  let restante = normalizado
  for (const estado of estadosBrasilExtenso) {
    restante = restante.replace(new RegExp(`\\b${escaparRegex(estado)}\\b`, "g"), "")
  }
  restante = restante
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()

  return restante.length > 0
}

/**
 * Modalidade efetiva. Ordem importa (ajuste 1 da diretiva):
 *
 *  1. Campo estruturado da fonte.
 *  2. Flag `remote: true` da fonte — sinal forte, não deixa a inferência
 *     de cidade sobrescrever.
 *  3. Sinal explícito na própria localização (remote / híbrido / presencial).
 *  4. Sinal consistente em título+descrição (só se um dos três aparece).
 *  5. Bandeira estrangeira — NÃO infere on-site. Deixa o fallback classificar.
 *  6. Cidade brasileira específica sem sinal contrário → on-site inferida.
 *  7. Fallback unknown.
 */
function modalidadeEfetiva(
  remota: boolean,
  workplaceType: string | null | undefined,
  localizacao: string | null,
  descricao: string | null,
  titulo: string | null
): { modalidade: ModalidadeEstruturada; inferida: boolean } {
  const doCampo = interpretarModalidadeEstruturada(workplaceType)
  if (doCampo !== "unknown") return { modalidade: doCampo, inferida: false }

  if (remota) return { modalidade: "remote", inferida: false }

  const textoLoc = normalizarTexto(localizacao ?? "")
  if (textoLoc) {
    if (contemAlgumTermo(textoLoc, SINAIS_REMOTO)) return { modalidade: "remote", inferida: false }
    if (contemAlgumTermo(textoLoc, SINAIS_HIBRIDO)) return { modalidade: "hybrid", inferida: false }
    if (contemAlgumTermo(textoLoc, SINAIS_PRESENCIAL)) return { modalidade: "on-site", inferida: false }
  }

  const textoRef = normalizarTexto(`${titulo ?? ""} ${descricao ?? ""}`)
  if (textoRef) {
    const temRemoto = contemAlgumTermo(textoRef, SINAIS_REMOTO)
    const temHibrido = contemAlgumTermo(textoRef, SINAIS_HIBRIDO)
    const temPresencial = contemAlgumTermo(textoRef, SINAIS_PRESENCIAL)
    const total = [temRemoto, temHibrido, temPresencial].filter(Boolean).length
    if (total === 1) {
      if (temRemoto) return { modalidade: "remote", inferida: false }
      if (temHibrido) return { modalidade: "hybrid", inferida: false }
      if (temPresencial) return { modalidade: "on-site", inferida: false }
    }
  }

  if (localizacaoTemBandeiraEstrangeira(localizacao)) {
    return { modalidade: "unknown", inferida: false }
  }

  if (localizacaoPareceCidadeEspecifica(localizacao)) {
    return { modalidade: "on-site", inferida: true }
  }

  return { modalidade: "unknown", inferida: false }
}

/**
 * Trava geográfica — diretiva v2.
 *  - Presencial: só passa na região metropolitana de João Pessoa.
 *  - Híbrido: passa em qualquer ponto do Brasil.
 *  - Remoto: passa só com menção explícita ao Brasil.
 *  - Unknown: fallback conservador.
 */
/**
 * Fallback textual quando location e null.
 *
 * Usa o texto CRU (nao normalizado) para checar UF, porque
 * localizacaoTemUfBrasileira procura UF maiuscula (DF, SP, RJ...).
 * Usa texto normalizado apenas para "brasil"/"brazil".
 *
 * Nao usa a lista localizacoesBrasil aqui: ela contem "para" (estado Para),
 * que casaria em frases genericas ("vaga para analista").
 */
function descricaoIndicaLocalizacaoBrasilFallback(
  descricaoRaw: string,
  tituloRaw: string | null
): boolean {
  if (!descricaoRaw && !tituloRaw) return false
  if (localizacaoTemUfBrasileira(descricaoRaw)) return true
  if (tituloRaw && localizacaoTemUfBrasileira(tituloRaw)) return true
  const texto = normalizarTexto(`${descricaoRaw} ${tituloRaw ?? ""}`)
  if (contemAlgumTermo(texto, ["brasil", "brazil"])) return true
  return false
}

export function avaliarElegibilidadeBrasil(
  localizacao: string | null,
  descricao: string | null = null,
  titulo: string | null = null,
  remota = false,
  localizacoesAceitas: string[] = [],
  workplaceType?: string | null
): ResultadoElegibilidadeLocalizacao {
  const textoLocalizacao = normalizarTexto(localizacao ?? "")
  const textoDescricao = normalizarTexto(descricao ?? "")
  const textoRestricoesBrasil = `${textoLocalizacao} ${textoDescricao}`.trim()

  if (contemAlgumTermo(textoRestricoesBrasil, exclusoesBrasil)) {
    return {
      situacao: "incompativel",
      motivo: "A oportunidade exclui explicitamente candidatos localizados no Brasil."
    }
  }

  if (vagaExclusivaPcd(titulo, descricao)) {
    return {
      situacao: "incompativel",
      motivo: "Vaga exclusiva/afirmativa PCD fora do escopo do perfil."
    }
  }

  if (descricaoRestringeParaOutroPais(textoDescricao)) {
    return {
      situacao: "incompativel",
      motivo: "A descrição exige residência ou autorização de trabalho em outro país."
    }
  }

  if (descricaoIndicaRestricaoFederalEstrangeira(textoDescricao)) {
    return {
      situacao: "incompativel",
      motivo: "A descrição menciona requisito de programa federal ou agência governamental estrangeira."
    }
  }

  // Fallback textual: location=null mas descricao/titulo mencionam Brasil/UF.
  // Roda DEPOIS de exclusoesBrasil e descricaoRestringeParaOutroPais, para nao
  // liberar vaga que a descricao explicitamente proibe no Brasil.
  if (!localizacao) {
    if (descricaoIndicaLocalizacaoBrasilFallback(descricao ?? "", titulo)) {
      return { situacao: "compativel", motivo: "A descrição da vaga indica localização no Brasil." }
    }
  }

  if (descricaoIndicaLocalizacaoBrasil(textoDescricao)) {
    return {
      situacao: "compativel",
      motivo: "A descrição informa explicitamente que a localização da vaga é o Brasil."
    }
  }

  const { modalidade, inferida } = modalidadeEfetiva(
    remota,
    workplaceType,
    localizacao,
    descricao,
    titulo
  )

  // Opção 2 (diretiva): bandeira estrangeira vence localizacoesAceitas.
  // Sem isso, um perfil com "global"/"latam"/"worldwide" libera vagas
  // remotas de Sérvia, Lituânia, etc. antes da Regra 3 avaliar.
  //
  // Guarda adicional (13/10): termos GENÉRICOS em localizacoesAceitas
  // ("brasil", "worldwide", "global", "latam", etc.) NÃO liberam vagas
  // presenciais. Para on-site vale apenas a Regra 1 (RMPJP) OU um item
  // de localizacoesAceitas que seja cidade específica. Também troca
  // `includes` por `contemTermo` (word boundary) para evitar que
  // "Brasília" case com "brasil" como substring.
  if (
    localizacoesAceitas.length > 0 &&
    localizacao &&
    !localizacaoTemBandeiraEstrangeira(localizacao)
  ) {
    const alvo = normalizarTexto(localizacao)
    const bate = localizacoesAceitas.some(item => {
      const termo = normalizarTexto(item)
      if (termo.length === 0) return false
      if (!contemTermo(alvo, termo)) return false
      if (modalidade === "on-site" && contemAlgumTermo(termo, localizacoesGenericas)) return false
      return true
    })
    if (bate) {
      return {
        situacao: "compativel",
        motivo: "Localização consta nas localizações aceitas do perfil."
      }
    }
  }

  if (modalidade === "on-site") {
    if (localizacaoNaRegiaoJoaoPessoa(localizacao)) {
      return {
        situacao: "compativel",
        motivo: "Vaga presencial na região metropolitana de João Pessoa."
      }
    }
    return {
      situacao: "incompativel",
      motivo: localizacao
        ? `Vaga presencial fora da região metropolitana de João Pessoa: ${localizacao}.`
        : "Vaga presencial sem localização na região metropolitana de João Pessoa.",
      inferida
    }
  }

  if (modalidade === "hybrid") {
    if (localizacaoBrasilConfirmada(localizacao)) {
      return { situacao: "compativel", motivo: "Vaga híbrida em território brasileiro." }
    }
    if (tituloTemUfBrasileira(titulo ?? "")) {
      return {
        situacao: "compativel",
        motivo: "Vaga híbrida com UF brasileira indicada no título."
      }
    }
    if (localizacaoTemBandeiraEstrangeira(localizacao)) {
      return {
        situacao: "incompativel",
        motivo: `Vaga híbrida com localização fora do Brasil: ${localizacao}.`
      }
    }
    if (!textoLocalizacao) {
      return {
        situacao: "indefinida",
        motivo: "Vaga híbrida sem localização suficiente para confirmar território brasileiro."
      }
    }
    return {
      situacao: "incompativel",
      motivo: `Vaga híbrida com localização não reconhecida: ${localizacao}.`
    }
  }

  if (modalidade === "remote") {
    if (localizacaoBrasilConfirmada(localizacao)) {
      return {
        situacao: "compativel",
        motivo: "Vaga remota com localização brasileira confirmada."
      }
    }
    if (tituloTemUfBrasileira(titulo ?? "")) {
      return {
        situacao: "compativel",
        motivo: "Vaga remota com UF brasileira indicada no título."
      }
    }
    if (localizacaoTemBandeiraEstrangeira(localizacao)) {
      return {
        situacao: "incompativel",
        motivo: `Vaga remota sem contratação no Brasil: ${localizacao}.`
      }
    }
    if (!textoLocalizacao) {
      return {
        situacao: "indefinida",
        motivo: "Vaga remota sem localização suficiente para confirmar território brasileiro."
      }
    }
    if (contemAlgumTermo(textoLocalizacao, SINAIS_REMOTO)) {
      return {
        situacao: "indefinida",
        motivo: "Vaga remota sem cidade/país — não é possível confirmar contratação no Brasil."
      }
    }
    return {
      situacao: "incompativel",
      motivo: `Vaga remota com localização não reconhecida: ${localizacao}.`
    }
  }

  if (localizacaoBrasilConfirmada(localizacao)) {
    return {
      situacao: "compativel",
      motivo: "A localização da oportunidade indica território brasileiro."
    }
  }

  if (tituloTemUfBrasileira(titulo ?? "")) {
    return {
      situacao: "compativel",
      motivo: "A oportunidade indica UF brasileira no título."
    }
  }

  if (localizacaoTemBandeiraEstrangeira(localizacao)) {
    return {
      situacao: "incompativel",
      motivo: localizacao
        ? `A localização informada está fora do Brasil: ${localizacao}.`
        : "O título indica uma oportunidade localizada fora do Brasil."
    }
  }

  if (!textoLocalizacao) {
    return {
      situacao: "indefinida",
      motivo: "A vaga não informou localização suficiente para confirmar que está no Brasil."
    }
  }

  if (contemAlgumTermo(textoLocalizacao, [...SINAIS_REMOTO, ...SINAIS_HIBRIDO, ...SINAIS_PRESENCIAL])) {
    return {
      situacao: "indefinida",
      motivo: "A modalidade foi informada, mas não existe localização brasileira confirmada."
    }
  }

  return {
    situacao: "incompativel",
    motivo: `A localização "${localizacao}" não foi reconhecida como território brasileiro.`
  }
}
