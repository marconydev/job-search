export type SituacaoLocalizacao =
  | "compativel"
  | "incompativel"
  | "indefinida"

export type ResultadoElegibilidadeLocalizacao = {
  situacao: SituacaoLocalizacao
  motivo: string
}

/**
 * Normalizo o texto para conseguir comparar localizações escritas
 * com ou sem acentos e com diferenças entre maiúsculas e minúsculas.
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
 * Reconheço algumas localizações brasileiras que costumam aparecer
 * sem a palavra Brasil no campo de localização das plataformas.
 *
 * Evito usar siglas curtas como SP ou RJ isoladamente porque elas
 * podem gerar falsos positivos em outros textos.
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
 * Mantenho aqui regiões que claramente indicam uma vaga restrita
 * a outro país ou mercado.
 *
 * Não tento cadastrar todos os países do mundo. Amplio esta lista
 * conforme os resultados reais do projeto mostrarem necessidade.
 */
const localizacoesIncompativeis = [
  "germany",
  "alemanha",
  "europe",
  "europa",
  "european union",
  "emea",
  "united states",
  "united states only",
  "us only",
  "usa only",
  "canada",
  "united kingdom",
  "uk only",
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
 * Alguns termos indicam uma área ampla que pode incluir o Brasil.
 *
 * Não aprovo nem descarto automaticamente esses casos porque preciso
 * de alguma informação adicional confirmando que o Brasil é aceito.
 */
const localizacoesAmplas = [
  "worldwide",
  "anywhere",
  "global",
  "latin america",
  "latam",
  "south america",
  "americas",
  "remote",
  "remoto",
  "remota"
]

function contemAlgumTermo(
  texto: string,
  termos: string[]
) {
  return termos.some(
    (termo) => texto.includes(termo)
  )
}

/**
 * Avalio se a oportunidade permite trabalho a partir do Brasil.
 *
 * Uso também a descrição como apoio porque algumas plataformas deixam
 * a localização genérica e informam a restrição geográfica apenas no
 * texto completo da vaga.
 */
export function avaliarElegibilidadeBrasil(
  localizacao: string | null,
  descricao: string | null = null
): ResultadoElegibilidadeLocalizacao {
  const textoLocalizacao = normalizarTexto(
    localizacao ?? ""
  )

  const textoDescricao = normalizarTexto(
    descricao ?? ""
  )

  const textoCompleto =
    `${textoLocalizacao} ${textoDescricao}`.trim()

  /**
   * Dou prioridade a uma indicação explícita de Brasil.
   *
   * Assim uma descrição como "Remote - Brazil" continua válida mesmo
   * que também mencione escritórios ou equipes de outros países.
   */
  if (
    contemAlgumTermo(
      textoCompleto,
      localizacoesBrasil
    )
  ) {
    return {
      situacao: "compativel",
      motivo:
        "A vaga possui indicação explícita de localização compatível com o Brasil."
    }
  }

  /**
   * Quando a própria localização aponta claramente para outro mercado,
   * descarto antes de considerar que a palavra remoto possa torná-la válida.
   */
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

  /**
   * Também observo restrições explícitas escritas dentro da descrição.
   */
  if (
    contemAlgumTermo(
      textoDescricao,
      localizacoesIncompativeis
    )
  ) {
    return {
      situacao: "incompativel",
      motivo:
        "A descrição indica uma restrição geográfica fora do Brasil."
    }
  }

  if (!textoLocalizacao) {
    return {
      situacao: "indefinida",
      motivo:
        "A vaga não informou localização suficiente para confirmar elegibilidade no Brasil."
    }
  }

  if (
    contemAlgumTermo(
      textoLocalizacao,
      localizacoesAmplas
    )
  ) {
    return {
      situacao: "indefinida",
      motivo:
        "A localização é ampla ou remota, mas ainda não confirma que candidatos no Brasil são aceitos."
    }
  }

  return {
    situacao: "indefinida",
    motivo:
      `Não consegui confirmar se a localização "${localizacao}" aceita candidatos no Brasil.`
  }
}