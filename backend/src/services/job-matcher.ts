import {
  perfilBusca
} from "../config/search-profile.js"

import type {
  JobMatch as CorrespondenciaVaga,
  StoredJob as VagaArmazenada
} from "../types/job.js"

/**
 * Normalizo também pontuação e caracteres especiais para comparar
 * expressões como TCP/IP, Node.js e palavras acentuadas de forma uniforme.
 */
function normalizarTexto(
  valor: string
) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Retiro HTML antes de analisar o conteúdo da descrição.
 */
function removerHtml(
  valor: string
) {
  return valor
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
}

/**
 * Procuro uma palavra ou expressão completa dentro do texto.
 *
 * Não uso includes diretamente porque termos curtos como API e Git
 * poderiam ser encontrados dentro de palavras sem relação.
 */
function contemExpressao(
  texto: string,
  termo: string
) {
  const textoNormalizado =
    ` ${normalizarTexto(texto)} `

  const termoNormalizado =
    normalizarTexto(termo)

  if (!termoNormalizado) {
    return false
  }

  return textoNormalizado.includes(
    ` ${termoNormalizado} `
  )
}

/**
 * Verifico se pelo menos um dos termos aparece no texto.
 */
function contemAlgum(
  texto: string,
  termos: string[]
) {
  return termos.some(
    (termo) =>
      contemExpressao(
        texto,
        termo
      )
  )
}

/**
 * Retorno os cargos do perfil que realmente aparecem no título.
 */
function encontrarCargos(
  titulo: string,
  cargos: string[]
) {
  return cargos.filter(
    (cargo) =>
      contemExpressao(
        titulo,
        cargo
      )
  )
}

/**
 * Encontro competências por conceito, sem contar sinônimos da mesma
 * tecnologia várias vezes.
 */
function encontrarCompetencias(
  texto: string
) {
  return perfilBusca.competencias
    .filter(
      (competencia) =>
        competencia.termos.some(
          (termo) =>
            contemExpressao(
              texto,
              termo
            )
        )
    )
    .map(
      (competencia) =>
        competencia.nome
    )
}

/**
 * Mantenho esta validação porque o matcher também pode receber vagas
 * provenientes de fontes diferentes do novo pipeline web.
 */
function localizacaoEhCompativel(
  localizacao: string
) {
  if (!localizacao) {
    return true
  }

  if (
    contemAlgum(
      localizacao,
      perfilBusca.localizacoesAceitas
    )
  ) {
    return true
  }

  return (
    localizacao === "remote" ||
    localizacao === "remoto" ||
    localizacao === "remota"
  )
}

/**
 * Aplico um peso maior quando o próprio título representa diretamente
 * uma das famílias profissionais que estou buscando.
 *
 * Uma vaga de Analista de Suporte não deve depender de possuir muitas
 * palavras técnicas na descrição para ser considerada relevante.
 */
function pontuarCargo(
  titulo: string,
  motivos: string[]
) {
  const cargosPrincipais =
    encontrarCargos(
      titulo,
      perfilBusca.cargosPrincipais
    )

  if (
    cargosPrincipais.length > 0
  ) {
    motivos.push(
      "Cargo diretamente relacionado ao perfil"
    )

    return {
      pontos: 60,
      aderente: true,
      principal: true
    }
  }

  const cargosRelacionados =
    encontrarCargos(
      titulo,
      perfilBusca.cargosRelacionados
    )

  if (
    cargosRelacionados.length > 0
  ) {
    motivos.push(
      "Cargo relacionado a uma área complementar do perfil"
    )

    return {
      pontos: 45,
      aderente: true,
      principal: false
    }
  }

  return {
    pontos: 0,
    aderente: false,
    principal: false
  }
}

/**
 * Penalizo cargos de desenvolvimento e engenharia que podem compartilhar
 * várias tecnologias com o meu perfil sem representar a vaga que procuro.
 *
 * Só aplico essa penalização quando o título não corresponde antes a
 * uma família de cargo aceita.
 */
function calcularPenalizacaoDesvio(
  titulo: string,
  cargoAderente: boolean,
  motivos: string[]
) {
  if (cargoAderente) {
    return 0
  }

  if (
    !contemAlgum(
      titulo,
      perfilBusca.cargosDesvio
    )
  ) {
    return 0
  }

  motivos.push(
    "Cargo pertence a uma trilha profissional diferente da busca principal"
  )

  return 20
}

/**
 * Uso competências como evidência complementar.
 *
 * Quando o cargo já é aderente, cada competência ajuda mais. Quando o
 * cargo não é aderente, tecnologias coincidentes não devem ser capazes
 * de transformar sozinhas uma vaga de outra área em relevante.
 */
function pontuarCompetencias(
  quantidade: number,
  cargoAderente: boolean
) {
  if (cargoAderente) {
    return Math.min(
      quantidade * 4,
      20
    )
  }

  return Math.min(
    quantidade * 2,
    16
  )
}

/**
 * Avalio uma vaga usando primeiro o cargo e depois as competências.
 *
 * Mantenho o corte de relevância fora desta função. Aqui apenas gero
 * uma pontuação coerente para as outras camadas decidirem o status.
 */
export function matchJob(
  vaga: VagaArmazenada
): CorrespondenciaVaga {
  const titulo =
    normalizarTexto(
      vaga.title
    )

  const localizacao =
    normalizarTexto(
      vaga.location ?? ""
    )

  const descricao =
    normalizarTexto(
      removerHtml(
        vaga.description
      )
    )

  const motivos: string[] = []

  if (
    contemAlgum(
      titulo,
      perfilBusca.titulosExcluidos
    )
  ) {
    return {
      job: vaga,
      score: 0,
      matchedSkills: [],
      reasons: [
        "Cargo fora da senioridade ou do tipo de vaga buscado"
      ]
    }
  }

  if (
    !localizacaoEhCompativel(
      localizacao
    )
  ) {
    return {
      job: vaga,
      score: 0,
      matchedSkills: [],
      reasons: [
        "Localização não compatível com a busca"
      ]
    }
  }

  let pontuacao = 0

  const resultadoCargo =
    pontuarCargo(
      titulo,
      motivos
    )

  pontuacao +=
    resultadoCargo.pontos

  if (vaga.remote) {
    pontuacao += 10

    motivos.push(
      "Vaga remota"
    )
  }

  pontuacao += 10

  motivos.push(
    "Localização compatível"
  )

  const textoPesquisavel =
    `${titulo} ${descricao}`

  const competenciasEncontradas =
    encontrarCompetencias(
      textoPesquisavel
    )

  pontuacao +=
    pontuarCompetencias(
      competenciasEncontradas.length,
      resultadoCargo.aderente
    )

  if (
    competenciasEncontradas.length > 0
  ) {
    motivos.push(
      `${competenciasEncontradas.length} competência(s) relacionada(s)`
    )
  }

  const penalizacaoDesvio =
    calcularPenalizacaoDesvio(
      titulo,
      resultadoCargo.aderente,
      motivos
    )

  pontuacao -=
    penalizacaoDesvio

  /**
   * Sem um cargo pertencente às famílias profissionais definidas no
   * perfil, não permito que coincidências tecnológicas sozinhas levem
   * a vaga para a faixa de relevância.
   *
   * Isso protege contra casos como Full Stack, Backend e AI Engineer.
   */
  if (
    !resultadoCargo.aderente
  ) {
    pontuacao =
      Math.min(
        pontuacao,
        55
      )
  }

  return {
    job: vaga,

    score:
      Math.max(
        0,
        Math.min(
          pontuacao,
          100
        )
      ),

    matchedSkills:
      competenciasEncontradas,

    reasons:
      motivos
  }
}