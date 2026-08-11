import type {
  ResultadoElegibilidadeLocalizacao
} from "../types/elegibilidade.js"

function normalizarTexto(
  valor: string
) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function escaparRegex(
  valor: string
) {
  return valor.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  )
}

function contemTermo(
  texto: string,
  termo: string
) {
  const padrao =
    new RegExp(
      `(^|[^a-z0-9])${escaparRegex(termo)}([^a-z0-9]|$)`,
      "i"
    )

  return padrao.test(
    texto
  )
}

function contemAlgumTermo(
  texto: string,
  termos: string[]
) {
  return termos.some(
    (termo) =>
      contemTermo(
        texto,
        termo
      )
  )
}

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
  "abaete",
  "campinas",
  "joinville",
  "campina grande"
]

const regioesCompativeis = [
  "worldwide",
  "anywhere",
  "global",
  "latin america",
  "latam",
  "south america",
  "americas"
]

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
  "new zealand",

  "japan",
  "apac",
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

const indicadoresContratacao = [
  "able to hire in",
  "currently able to hire in",
  "open to candidates in",
  "open to applicants in",
  "we hire in",
  "hiring in",
  "hiring countries",
  "countries:"
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
 * Reconheço padrões brasileiros muito comuns em títulos da Gupy,
 * como "(SP)", "/RS" ou "- PB".
 *
 * Exijo também algum termo português relacionado ao nosso contexto para
 * reduzir a chance de interpretar uma sigla estrangeira como estado brasileiro.
 */
function tituloTemUfBrasileira(
  titulo: string
) {
  const possuiContextoPortugues =
    /\b(analista|atendente|suporte|tecnico|sistemas|implantacao|infraestrutura|garantia|fiscal)\b/i.test(
      titulo
    )

  if (!possuiContextoPortugues) {
    return false
  }

  return ufsBrasil.some(
    (uf) => {
      const padrao =
        new RegExp(
          `(\\/|\\(|-|,\\s*)${uf}(\\)|\\b)`,
          "i"
        )

      return padrao.test(
        titulo
      )
    }
  )
}

function descricaoRestringeParaOutroPais(
  descricao: string
) {
  if (
    !contemAlgumTermo(
      descricao,
      indicadoresRestricao
    )
  ) {
    return false
  }

  return contemAlgumTermo(
    descricao,
    localizacoesIncompativeis
  )
}

function descricaoConfirmaBrasil(
  descricao: string
) {
  if (
    !contemTermo(
      descricao,
      "brazil"
    ) &&
    !contemTermo(
      descricao,
      "brasil"
    )
  ) {
    return false
  }

  for (
    const indicador
    of indicadoresContratacao
  ) {
    const indice =
      descricao.indexOf(
        indicador
      )

    if (indice === -1) {
      continue
    }

    const trecho =
      descricao.slice(
        indice,
        indice + 1000
      )

    if (
      contemTermo(
        trecho,
        "brazil"
      ) ||
      contemTermo(
        trecho,
        "brasil"
      )
    ) {
      return true
    }
  }

  return false
}

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
      situacao:
        "incompativel",

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
      situacao:
        "incompativel",

      motivo:
        "A descrição exige residência ou autorização de trabalho em outro país."
    }
  }

  if (
    contemAlgumTermo(
      textoReferencia,
      localizacoesBrasil
    ) ||
    tituloTemUfBrasileira(
      titulo ?? ""
    )
  ) {
    return {
      situacao:
        "compativel",

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
      situacao:
        "compativel",

      motivo:
        "A região informada inclui candidatos localizados no Brasil."
    }
  }

  if (
    descricaoConfirmaBrasil(
      textoDescricao
    )
  ) {
    return {
      situacao:
        "compativel",

      motivo:
        "A descrição confirma explicitamente que a empresa pode contratar candidatos no Brasil."
    }
  }

  if (
    contemAlgumTermo(
      textoReferencia,
      localizacoesIncompativeis
    )
  ) {
    return {
      situacao:
        "incompativel",

      motivo:
        localizacao
          ? `A localização informada não é compatível com o Brasil: ${localizacao}.`
          : "O título indica uma oportunidade restrita a outro país ou região."
    }
  }

  if (!textoLocalizacao) {
    return {
      situacao:
        "indefinida",

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
      situacao:
        "indefinida",

      motivo:
        "A vaga é remota, mas ainda não informa de quais países aceita candidatos."
    }
  }

  return {
    situacao:
      "indefinida",

    motivo:
      `Não consegui confirmar se a localização "${localizacao}" aceita candidatos no Brasil.`
  }
}