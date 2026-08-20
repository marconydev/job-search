import type { ResultadoElegibilidadeLocalizacao } from "../types/elegibilidade.js"

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
 * Aqui eu considero somente sinais que realmente permitem associar a
 * oportunidade ao território brasileiro.
 *
 * Regiões globais, LATAM ou simplesmente "remote" não são suficientes.
 */
const localizacoesBrasil = [
  "brasil",
  "brazil",

  "acre",
  "alagoas",
  "amapa",
  "amazonas",
  "bahia",
  "ceara",
  "distrito federal",
  "espirito santo",
  "goias",
  "maranhao",
  "mato grosso",
  "mato grosso do sul",
  "minas gerais",
  "para",
  "paraiba",
  "parana",
  "pernambuco",
  "piaui",
  "rio de janeiro",
  "rio grande do norte",
  "rio grande do sul",
  "rondonia",
  "roraima",
  "santa catarina",
  "sao paulo",
  "sergipe",
  "tocantins",

  "joao pessoa",
  "campina grande",
  "recife",
  "fortaleza",
  "salvador",
  "campinas",
  "barueri",
  "osasco",
  "sao carlos",
  "ribeirao preto",
  "sorocaba",
  "belo horizonte",
  "uberlandia",
  "vitoria",
  "curitiba",
  "londrina",
  "maringa",
  "florianopolis",
  "blumenau",
  "joinville",
  "porto alegre",
  "caxias do sul",
  "brasilia",
  "goiania",
  "anapolis",
  "campo grande",
  "cuiaba"
]

const ufsBrasil = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
]

/**
 * Esses termos indicam alcance internacional, mas não uma vaga
 * localizada no Brasil.
 */
const regioesGlobais = [
  "worldwide",
  "anywhere",
  "global",
  "latin america",
  "latam",
  "south america",
  "americas",
  "world",
  "emea",
  "europe",
  "apac"
]

const localizacoesEstrangeiras = [
  "united states",
  "usa",
  "canada",

  "united kingdom",
  "ireland",

  "portugal",
  "spain",
  "france",
  "italy",
  "germany",
  "netherlands",
  "poland",
  "sweden",
  "norway",
  "lithuania",
  "lituania",
  "serbia",
  "servia",
  "romania",
  "hungary",
  "croatia",
  "czech republic",
  "czechia",
  "estonia",
  "latvia",

  "south africa",

  "india",
  "pakistan",

  "australia",
  "new zealand",

  "japan",
  "singapore",

  "united arab emirates",
  "uae",
  "qatar"
]

const exclusoesBrasil = [
  "except brazil",
  "except brasil",
  "excluding brazil",
  "excluding brasil",
  "not available in brazil",
  "not available in brasil",
  "cannot hire in brazil",
  "cannot hire in brasil",
  "can't hire in brazil",
  "can't hire in brasil",
  "nao contratamos no brasil",
  "nao aceita candidatos do brasil"
]

const indicadoresRestricao = [
  "must be based in",
  "must reside in",
  "must be located in",
  "applicants must be based in",
  "candidates must be based in",
  "only candidates in",
  "only candidates located in",
  "legal right to work in",
  "right to work in"
]

/**
 * Em descrições sem um campo de localização estruturado, aceito apenas
 * frases que realmente indiquem que o local da vaga é o Brasil.
 *
 * Não considero "we hire in Brazil" suficiente, pois isso também aparece
 * em vagas globais.
 */
const indicadoresLocalizacaoBrasil = [
  "based in brazil",
  "based in brasil",
  "located in brazil",
  "located in brasil",
  "location brazil",
  "location brasil",
  "work location brazil",
  "work location brasil",
  "workplace brazil",
  "workplace brasil",
  "remote brazil",
  "remote brasil",
  "brazil remote",
  "brasil remote",
  "brasil remoto",
  "brasil remota",
  "remoto brasil",
  "remota brasil",
  "vaga remota brasil",
  "vaga remota no brasil",
  "trabalho remoto brasil",
  "trabalho remoto no brasil",
  "home office brazil",
  "home office brasil"
]

function localizacaoTemUfBrasileira(localizacao: string) {
  const texto = localizacao.trim()

  if (!texto) {
    return false
  }

  if (/^BR$/i.test(texto)) {
    return true
  }

  return ufsBrasil.some(uf => {
    /**
     * A sigla precisa estar em maiúsculas no valor original.
     *
     * Sem essa exigência, a preposição alemã "am" em
     * "Frankfurt am Main" era interpretada como AM (Amazonas).
     */
    const padrao = new RegExp(`(^|[\\s,;/|()\\-–—])${uf}($|[\\s,;/|()\\-–—])`)

    return padrao.test(texto)
  })
}

/**
 * Reconheço padrões como:
 *
 * Analista de Suporte - SP
 * Técnico de TI / PB
 * Analista de Sistemas (PR)
 *
 * Exijo contexto profissional em português para reduzir falsos positivos
 * com siglas estrangeiras.
 */
function tituloTemUfBrasileira(titulo: string) {
  const possuiContextoPortugues =
    /\b(analista|atendente|suporte|tecnico|técnico|sistemas|implantacao|implantação|infraestrutura|dados|monitoramento)\b/i.test(
      titulo
    )

  if (!possuiContextoPortugues) {
    return false
  }

  return ufsBrasil.some(uf => {
    /**
     * Aceito formatos comuns encontrados nos títulos das vagas:
     *
     * Analista de Suporte - SP
     * Analista de Suporte-SP
     * Analista de Suporte / SP
     * Analista de Suporte (SP)
     * Analista de Suporte, SP
     */
    const padrao = new RegExp(`(?:\\/|\\(|-|,\\s*)\\s*${uf}(?:\\)|\\b)`)

    return padrao.test(titulo)
  })
}

function descricaoRestringeParaOutroPais(descricao: string) {
  if (!contemAlgumTermo(descricao, indicadoresRestricao)) {
    return false
  }

  return contemAlgumTermo(descricao, localizacoesEstrangeiras)
}

function descricaoIndicaLocalizacaoBrasil(descricao: string) {
  return contemAlgumTermo(descricao, indicadoresLocalizacaoBrasil)
}

/**
 * A regra é propositalmente conservadora:
 *
 * - comprovação de Brasil -> compatível;
 * - comprovação de outro país/região global -> incompatível;
 * - sem informação suficiente -> indefinida.
 *
 * Tanto "incompatível" quanto "indefinida" são descartadas pelo pipeline
 * de importação. Assim uma vaga remota nunca entra apenas por ser remota.
 */
export function avaliarElegibilidadeBrasil(
  localizacao: string | null,
  descricao: string | null = null,
  titulo: string | null = null
): ResultadoElegibilidadeLocalizacao {
  const textoLocalizacao = normalizarTexto(localizacao ?? "")

  const textoDescricao = normalizarTexto(descricao ?? "")

  const textoTitulo = normalizarTexto(titulo ?? "")

  const textoReferencia = `${textoTitulo} ${textoLocalizacao}`.trim()

  if (contemAlgumTermo(textoDescricao, exclusoesBrasil)) {
    return {
      situacao: "incompativel",

      motivo: "A descrição exclui explicitamente candidatos localizados no Brasil."
    }
  }

  if (descricaoRestringeParaOutroPais(textoDescricao)) {
    return {
      situacao: "incompativel",

      motivo: "A descrição exige residência ou autorização de trabalho em outro país."
    }
  }

  if (
    contemAlgumTermo(textoReferencia, localizacoesBrasil) ||
    localizacaoTemUfBrasileira(localizacao ?? "") ||
    tituloTemUfBrasileira(titulo ?? "")
  ) {
    return {
      situacao: "compativel",

      motivo: "A localização da oportunidade indica território brasileiro."
    }
  }

  if (descricaoIndicaLocalizacaoBrasil(textoDescricao)) {
    return {
      situacao: "compativel",

      motivo: "A descrição informa explicitamente que a localização da vaga é o Brasil."
    }
  }

  if (contemAlgumTermo(textoReferencia, regioesGlobais)) {
    return {
      situacao: "indefinida",

      motivo:
        "A vaga é global ou regional. Não há evidência de exclusão do Brasil, mas a elegibilidade precisa ser confirmada."
    }
  }

  if (contemAlgumTermo(textoReferencia, localizacoesEstrangeiras)) {
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

  if (
    contemTermo(textoLocalizacao, "remote") ||
    contemTermo(textoLocalizacao, "remoto") ||
    contemTermo(textoLocalizacao, "remota")
  ) {
    return {
      situacao: "indefinida",

      motivo: "A vaga é remota, mas não informa que a oportunidade está localizada no Brasil."
    }
  }

  return {
    situacao: "indefinida",

    motivo: `Não consegui confirmar que a localização "${localizacao}" pertence ao Brasil.`
  }
}
