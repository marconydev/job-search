import "dotenv/config"

import {
  readFile,
  writeFile,
  mkdir
} from "node:fs/promises"

import {
  resolve
} from "node:path"

import {
  db
} from "../database/connection.js"

import {
  resolverDescobertasWeb
} from "../services/resolucao-descobertas-web.js"

import type {
  ResultadoProcessamentoWeb
} from "../types/processamento-web.js"

type ArquivoDiagnostico = {
  geradoEm: string
  resultado: ResultadoProcessamentoWeb
}

/**
 * Permito controlar a quantidade pelo terminal sem precisar editar
 * novamente o código.
 *
 * Exemplo:
 * npm run resolve -- --limite=10
 */
function lerLimite() {
  const argumento =
    process.argv.find(
      (item) =>
        item.startsWith(
          "--limite="
        )
    )

  if (!argumento) {
    return 10
  }

  const valor =
    Number(
      argumento.split("=")[1]
    )

  if (
    !Number.isInteger(valor) ||
    valor <= 0
  ) {
    return 10
  }

  return Math.min(
    valor,
    50
  )
}

/**
 * Por segurança a resolução funciona em modo de diagnóstico.
 *
 * Só permito gravar quando eu informar explicitamente --salvar.
 */
function deveSalvar() {
  return process.argv.includes(
    "--salvar"
  )
}

async function carregarDiagnostico() {
  const arquivo =
    resolve(
      process.cwd(),
      ".cache",
      "ultimo-diagnostico-web.json"
    )

  const conteudo =
    await readFile(
      arquivo,
      "utf8"
    )

  const dados =
    JSON.parse(
      conteudo
    ) as ArquivoDiagnostico

  return {
    arquivo,
    dados
  }
}

async function salvarResultado(
  resultado:
    Awaited<
      ReturnType<
        typeof resolverDescobertasWeb
      >
    >
) {
  const diretorio =
    resolve(
      process.cwd(),
      ".cache"
    )

  await mkdir(
    diretorio,
    {
      recursive: true
    }
  )

  const arquivo =
    resolve(
      diretorio,
      "ultima-resolucao-descobertas.json"
    )

  await writeFile(
    arquivo,
    JSON.stringify(
      {
        geradoEm:
          new Date().toISOString(),

        resultado
      },
      null,
      2
    ),
    "utf8"
  )

  return arquivo
}

/**
 * Uso o último diagnóstico para não repetir toda a descoberta.
 *
 * Cada candidata selecionada pode gerar uma nova chamada da Brave,
 * então mantenho um limite baixo e explícito.
 */
async function executar() {
  const limite =
    lerLimite()

  const salvar =
    deveSalvar()

  console.log("")
  console.log(
    "Resolvendo descobertas para publicações oficiais..."
  )

  console.log("")
  console.log(
    `Limite desta execução: ${limite}`
  )

  console.log(
    `Gravar no banco: ${salvar ? "sim" : "não"}`
  )

  console.log("")

  try {
    const {
      dados
    } =
      await carregarDiagnostico()

    const paginas =
      dados.resultado
        .somenteDescoberta

    console.log(
      `Descobertas disponíveis no cache: ${paginas.length}`
    )

    const resultado =
      await resolverDescobertasWeb(
        paginas,
        {
          limite,
          salvarCompativeis:
            salvar
        }
      )

    console.log("")
    console.log("Resumo da resolução")
    console.log("-------------------")

    console.log(
      `Recebidas:              ${resultado.candidatasRecebidas}`
    )

    console.log(
      `Selecionadas:           ${resultado.candidatasSelecionadas}`
    )

    console.log(
      `Resolvidas:             ${resultado.resolvidas}`
    )

    console.log(
      `Brasil:                 ${resultado.compativeisBrasil}`
    )

    console.log(
      `Fora do Brasil:         ${resultado.incompativeisBrasil}`
    )

    console.log(
      `Indefinidas:            ${resultado.indefinidas}`
    )

    console.log(
      `Importadas:             ${resultado.importadas}`
    )

    console.log(
      `Duplicadas:             ${resultado.duplicadas}`
    )

    console.log("")
    console.log("Vagas resolvidas")
    console.log("---------------")

    for (
      const vaga
      of resultado.vagasResolvidas
    ) {
      console.log("")

      console.log(
        `${vaga.tituloDescoberto}`
      )

      console.log(
        `→ ${vaga.tituloOficial}`
      )

      console.log(
        `Origem: ${vaga.origemDescoberta} → ${vaga.provedorOficial}`
      )

      console.log(
        `Empresa: ${vaga.empresa ?? "não informada"}`
      )

      console.log(
        `Local: ${vaga.localizacao ?? "não informado"}`
      )

      console.log(
        `Brasil: ${vaga.elegibilidadeBrasil}`
      )

      console.log(
        `Similaridade: ${Math.round(
          vaga.similaridadeTitulo *
          100
        )}%`
      )

      console.log(
        `URL oficial: ${vaga.urlOficial}`
      )
    }

    const arquivo =
      await salvarResultado(
        resultado
      )

    console.log("")
    console.log(
      "Relatório salvo localmente:"
    )

    console.log(
      arquivo
    )
  } catch (erro) {
    console.error("")
    console.error(
      "Falha durante a resolução das descobertas:",
      erro
    )

    process.exitCode = 1
  } finally {
    await db.end()
  }
}

executar()