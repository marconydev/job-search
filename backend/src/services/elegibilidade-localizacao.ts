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
 * Procuro termos completos para evitar falsos positivos.
 *
 * Por exemplo, não quero considerar "india" encontrada dentro de
 * outra palavra como uma indicação válida do país India.
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
 * Reconheço localizações brasileiras que podem aparecer tanto no
 * campo de localização quanto diretamente no título da oportunidade.
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
  "vitoria",
  "uberlandia",
  "barbacena",
  "abaete"
]

/**
 * Considero estas regiões compatíveis porque incluem candidatos
 * localizados no Brasil.
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
 * Mantenho mercados que aparecem com frequência nas buscas e que
 * claramente não representam uma oportunidade disponível no Brasil.
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
 * Procuro exclusões explícitas antes de considerar qualquer região
 * ampla como compatível com o Brasil.
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
 * Uso estes indicadores para diferenciar uma simples menção a outro
 * país de uma exigência real de residência ou autorização de trabalho.
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
 * Considero título e localização como sinais diretos. Uso a descrição
 * principalmente para encontrar restrições explícitas de contratação.
 */
export function avaliarElegibilidadeBrasil(
  localizacao: string | null,
  descricao: string | null = null,
  titulo: string | null = null
): ResultadoElegibilidadeLocalizacao {
  const textoLocalizacao =
    normalizarTexto(
      localizacao ?? ""
    )

  const textoDescricao =
    normalizarTexto(
      descricao ?? ""
    )

  const textoTitulo =
    normalizarTexto(
      titulo ?? ""
    )

  const textoReferencia =
    `${textoTitulo} ${textoLocalizacao}`.trim()

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
      textoReferencia,
      localizacoesBrasil
    )
  ) {
    return {
      situacao: "compativel",
      motivo:
        "O título ou a localização indica uma oportunidade compatível com o Brasil."
    }
  }

  if (
    contemAlgumTermo(
      textoReferencia,
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
      textoReferencia,
      localizacoesIncompativeis
    )
  ) {
    return {
      situacao: "incompativel",
      motivo:
        localizacao
          ? `A localização informada não é compatível com o Brasil: ${localizacao}.`
          : "O título indica uma oportunidade restrita a outro país ou região."
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