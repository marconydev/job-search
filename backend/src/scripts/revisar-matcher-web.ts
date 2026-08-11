import "dotenv/config"

import {
  db
} from "../database/connection.js"

type LinhaRevisaoMatcher = {
  idVaga: string
  origem: string
  empresa: string
  titulo: string
  localizacao: string | null
  remoto: boolean
  pontuacao: number
  status: string
  habilidades: unknown
  motivos: unknown
  analisadaEm: Date | string
}

const provedoresWeb = [
  "gupy",
  "lever",
  "greenhouse",
  "workable",
  "smartrecruiters"
]

/**
 * Traduzo somente para a exibição no terminal.
 *
 * Mantenho os valores persistidos no banco como estão porque fazem
 * parte da estrutura atual do projeto.
 */
function traduzirStatus(
  status: string
) {
  const rotulos: Record<
    string,
    string
  > = {
    relevant: "RELEVANTE",
    discarded: "DESCARTADA",
    applied: "APLICADA",
    ignored: "IGNORADA"
  }

  return (
    rotulos[status] ??
    status.toUpperCase()
  )
}

/**
 * Transformo os valores JSON armazenados no banco em um texto curto
 * e legível para conseguir revisar o matcher pelo terminal.
 */
function formatarValores(
  valor: unknown
) {
  if (valor === null || valor === undefined) {
    return "nenhum"
  }

  if (Array.isArray(valor)) {
    if (valor.length === 0) {
      return "nenhum"
    }

    return valor
      .map((item) => {
        if (typeof item === "string") {
          return item
        }

        return JSON.stringify(item)
      })
      .join(", ")
  }

  if (typeof valor === "string") {
    return valor || "nenhum"
  }

  return JSON.stringify(valor)
}

/**
 * Agrupo as pontuações para enxergar se as vagas descartadas estão
 * muito longe do limite ou apenas alguns pontos abaixo dele.
 */
function mostrarDistribuicao(
  linhas: LinhaRevisaoMatcher[]
) {
  const faixas = {
    "80-100": 0,
    "60-79": 0,
    "40-59": 0,
    "20-39": 0,
    "0-19": 0
  }

  for (const linha of linhas) {
    if (linha.pontuacao >= 80) {
      faixas["80-100"]++
      continue
    }

    if (linha.pontuacao >= 60) {
      faixas["60-79"]++
      continue
    }

    if (linha.pontuacao >= 40) {
      faixas["40-59"]++
      continue
    }

    if (linha.pontuacao >= 20) {
      faixas["20-39"]++
      continue
    }

    faixas["0-19"]++
  }

  console.log("")
  console.log("Distribuição das pontuações")
  console.log("---------------------------")

  for (
    const [faixa, quantidade]
    of Object.entries(faixas)
  ) {
    console.log(
      `${faixa.padEnd(8)} ${quantidade}`
    )
  }
}

/**
 * Mostro cada oportunidade com os dados que realmente influenciaram
 * a decisão do matcher.
 */
function mostrarVaga(
  linha: LinhaRevisaoMatcher
) {
  console.log("")
  console.log(
    `[${linha.pontuacao}] ${traduzirStatus(linha.status)}`
  )

  console.log(
    `${linha.empresa} | ${linha.titulo}`
  )

  console.log(
    `Origem: ${linha.origem}`
  )

  console.log(
    `Local: ${linha.localizacao ?? "não informado"}`
  )

  console.log(
    `Remoto: ${linha.remoto ? "sim" : "não"}`
  )

  console.log(
    `Habilidades: ${formatarValores(linha.habilidades)}`
  )

  console.log(
    `Motivos: ${formatarValores(linha.motivos)}`
  )

  console.log(
    "------------------------------------------------------------"
  )
}

/**
 * Consulto somente as vagas vindas do novo pipeline web para revisar
 * esta etapa sem misturar resultados antigos de outros coletores.
 */
async function executar() {
  try {
    const resultado =
      await db.query<LinhaRevisaoMatcher>(
        `
          SELECT
            j.id AS "idVaga",
            j.source AS "origem",
            j.company AS "empresa",
            j.title AS "titulo",
            j.location AS "localizacao",
            j.remote AS "remoto",
            jm.local_score AS "pontuacao",
            jm.status AS "status",
            jm.matched_skills AS "habilidades",
            jm.reasons AS "motivos",
            jm.analyzed_at AS "analisadaEm"
          FROM jobs j
          INNER JOIN job_matches jm
            ON jm.job_id = j.id
          WHERE j.source = ANY($1::varchar[])
          ORDER BY
            jm.local_score DESC,
            jm.analyzed_at DESC
        `,
        [
          provedoresWeb
        ]
      )

    const linhas =
      resultado.rows

    const relevantes =
      linhas.filter(
        (linha) =>
          linha.status === "relevant"
      )

    const descartadas =
      linhas.filter(
        (linha) =>
          linha.status === "discarded"
      )

    console.log("")
    console.log("Auditoria do matcher")
    console.log("====================")

    console.log("")
    console.log(
      `Vagas analisadas: ${linhas.length}`
    )

    console.log(
      `Relevantes:       ${relevantes.length}`
    )

    console.log(
      `Descartadas:      ${descartadas.length}`
    )

    mostrarDistribuicao(
      linhas
    )

    console.log("")
    console.log("Ranking completo")
    console.log("================")

    for (const linha of linhas) {
      mostrarVaga(linha)
    }
  } catch (erro) {
    console.error(
      "Não consegui revisar os resultados do matcher:",
      erro
    )

    process.exitCode = 1
  } finally {
    await db.end()
  }
}

executar()