import type {
  ResultadoElegibilidadeLocalizacao
} from "../types/elegibilidade.js"

/**
 * Normalizo o texto para comparar localizações independentemente
 * de acentos, letras maiúsculas ou espaços duplicados.
 */
function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Escapo caracteres especiais antes de montar uma expressão regular.
 */
function escaparRegex(valor: string) {
  return valor.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  )
}

/**
 * Procuro o termo como uma palavra ou expressão completa.
 *
 * Evito usar includes diretamente porque, por exemplo, "india"
 * não deve ser encontrada dentro de "indiana".
 */
function contemTermo(
  texto: string,
  termo: string
) {
  const termoEscapado =
    escaparRegex(termo)

  const padrao = new RegExp(
    `(^|[^a-z0-9])${termoEscapado}([^a-z0-9]|$)`,
    "i"
  )

  return padrao.test(texto)
}

function contemAlgumTermo(
  texto: string,
  termos: string[]
) {
  return termos.some(
    (termo) =>
      contemTermo(texto, termo)
  )
}

/**
 * Reconheço localizações brasileiras que podem aparecer sem a
 * palavra Brasil no campo de localização.
 */
const localizacoesBrasil = [
  "brasil",
  "brazil",
  "sao paulo",
  "rio de janeiro",
  "minas gerais",
  "belo horizonte",
  "parana",
  "curitiba",
  "santa catarina",
  "florianopolis",
  "rio grande do sul",
  "porto alegre",
  "pernambuco",
  "recife",
  "paraiba",
  "joao pessoa",
  "bahia",
  "salvador",
  "ceara",
  "fortaleza",
  "goias",
  "goiania",
  "distrito federal",
  "brasilia",
  "espirito santo",
  "vitoria"
]

/**
 * Considero estas regiões amplas compatíveis porque incluem o Brasil.
 *
 * Ainda posso invalidar a vaga se a descrição trouxer uma restrição
 * explícita excluindo candidatos brasileiros.
 */
const regioesCompativeis = [
  "worldwide",
  "anywhere",
  "global",
  "latin america",
  "latam",
  "south america",
  "americas"
]

/**
 * Mantenho aqui alguns mercados encontrados com frequência nas buscas
 * e que claramente não representam uma vaga disponível no Brasil.
 */
const localizacoesIncompativeis = [
  "germany",
  "alemanha",
  "europe",
  "europa",
  "european union",
  "emea",
  "united states",
  "usa",
  "canada",
  "united kingdom",
  "ireland",
  "portugal",
  "spain",
  "france",
  "italy",
  "netherlands",
  "poland",
  "sweden",
  "norway",
  "south africa",
  "india",
  "australia",
  "new zealand"
]

/**
 * Procuro primeiro restrições explícitas contra candidatos localizados
 * no Brasil para não aprovar uma vaga apenas porque ela também usa
 * termos como global ou worldwide.
 */
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

/**
 * Uso estes textos para diferenciar uma simples menção a outro país
 * de uma restrição real de residência ou autorização de trabalho.
 */
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

function descricaoRestringeParaOutroPais(
  descricao: string
) {
  const possuiIndicador =
    contemAlgumTermo(
      descricao,
      indicadoresRestricao
    )

  if (!possuiIndicador) {
    return false
  }

  return contemAlgumTermo(
    descricao,
    localizacoesIncompativeis
  )
}

/**
 * Avalio se consigo confirmar que a oportunidade aceita candidatos
 * trabalhando a partir do Brasil.
 *
 * Remoto sozinho não é suficiente. A vaga também precisa possuir uma
 * localização compatível ou não apresentar uma restrição internacional.
 */
export function avaliarElegibilidadeBrasil(
  localizacao: string | null,
  descricao: string | null = null
): ResultadoElegibilidadeLocalizacao {
  const textoLocalizacao =
    normalizarTexto(
      localizacao ?? ""
    )

  const textoDescricao =
    normalizarTexto(
      descricao ?? ""
    )

  if (
    contemAlgumTermo(
      textoDescricao,
      exclusoesBrasil
    )
  ) {
    return {
      situacao: "incompativel",
      motivo:
        "A descrição exclui explicitamente candidatos localizados no Brasil."
    }
  }

  if (
    descricaoRestringeParaOutroPais(
      textoDescricao
    )
  ) {
    return {
      situacao: "incompativel",
      motivo:
        "A descrição exige residência ou autorização de trabalho em outro país."
    }
  }

  if (
    contemAlgumTermo(
      textoLocalizacao,
      localizacoesBrasil
    )
  ) {
    return {
      situacao: "compativel",
      motivo:
        "A localização informada é compatível com o Brasil."
    }
  }

  if (
    contemAlgumTermo(
      textoLocalizacao,
      regioesCompativeis
    )
  ) {
    return {
      situacao: "compativel",
      motivo:
        "A região informada inclui candidatos localizados no Brasil."
    }
  }

  if (
    contemAlgumTermo(
      textoLocalizacao,
      localizacoesIncompativeis
    )
  ) {
    return {
      situacao: "incompativel",
      motivo:
        `A localização informada não é compatível com o Brasil: ${localizacao}.`
    }
  }

  if (!textoLocalizacao) {
    return {
      situacao: "indefinida",
      motivo:
        "A vaga não informou localização suficiente para confirmar a elegibilidade no Brasil."
    }
  }

  if (
    contemTermo(
      textoLocalizacao,
      "remote"
    ) ||
    contemTermo(
      textoLocalizacao,
      "remoto"
    ) ||
    contemTermo(
      textoLocalizacao,
      "remota"
    )
  ) {
    return {
      situacao: "indefinida",
      motivo:
        "A vaga é remota, mas ainda não informa de quais países aceita candidatos."
    }
  }

  return {
    situacao: "indefinida",
    motivo:
      `Não consegui confirmar se a localização "${localizacao}" aceita candidatos no Brasil.`
  }
}