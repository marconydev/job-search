import "dotenv/config"

import {
  mkdir,
  writeFile
} from "node:fs/promises"

import {
  resolve
} from "node:path"

import {
  processarVagasWeb
} from "../services/processamento-vagas-web.js"

async function salvarRelatorio(
  resultado: Awaited<
    ReturnType<typeof processarVagasWeb>
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
      "ultimo-diagnostico-web.json"
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

function mostrarFontesSomenteDescoberta(
  resultado: Awaited<
    ReturnType<typeof processarVagasWeb>
  >
) {
  const grupos =
    new Map<
      string,
      typeof resultado.somenteDescoberta
    >()

  for (
    const pagina
    of resultado.somenteDescoberta
  ) {
    const paginas =
      grupos.get(
        pagina.provedor
      ) ?? []

    paginas.push(
      pagina
    )

    grupos.set(
      pagina.provedor,
      paginas
    )
  }

  console.log("")
  console.log(
    "Fontes somente para descoberta"
  )

  console.log(
    "------------------------------"
  )

  for (
    const [
      provedor,
      paginas
    ]
    of grupos
  ) {
    console.log("")
    console.log(
      `${provedor.toUpperCase()}: ${paginas.length}`
    )

    const limite =
      provedor === "linkedin" ||
      provedor === "indeed"
        ? 10
        : 5

    for (
      const pagina
      of paginas.slice(
        0,
        limite
      )
    ) {
      console.log("")
      console.log(
        pagina.titulo
      )

      console.log(
        pagina.url
      )

      console.log(
        `Busca: ${pagina.consulta}`
      )
    }

    if (
      paginas.length >
      limite
    ) {
      console.log("")
      console.log(
        `... mais ${
          paginas.length -
          limite
        } resultado(s) salvo(s) no relatório.`
      )
    }
  }

  if (
    grupos.size === 0
  ) {
    console.log("")
    console.log(
      "Nenhuma página ficou somente na descoberta."
    )
  }
}

function mostrarPendencias(
  resultado: Awaited<
    ReturnType<typeof processarVagasWeb>
  >,
  tipo:
    "extracao" |
    "indisponivel" |
    "localizacao" |
    "acesso",
  tituloSecao: string
) {
  const pendencias =
    resultado.pendencias.filter(
      (pendencia) =>
        pendencia.tipo ===
        tipo
    )

  console.log("")
  console.log(
    `${tituloSecao} (${pendencias.length})`
  )

  console.log(
    "--------------------------------"
  )

  if (
    pendencias.length === 0
  ) {
    console.log("")
    console.log(
      "Nenhum caso encontrado."
    )

    return
  }

  for (
    const pendencia
    of pendencias
  ) {
    console.log("")
    console.log(
      `[${pendencia.provedor.toUpperCase()}] ${pendencia.titulo}`
    )

    if (
      tipo === "localizacao"
    ) {
      console.log(
        `Local: ${
          pendencia.localizacao ??
          "não informado"
        }`
      )
    }

    console.log(
      `URL: ${pendencia.url}`
    )

    console.log(
      `Motivo: ${pendencia.motivo}`
    )
  }
}

function mostrarResumoPorProvedor(
  resultado: Awaited<
    ReturnType<typeof processarVagasWeb>
  >
) {
  console.log("")
  console.log(
    "ATS processados"
  )

  console.log(
    "---------------"
  )

  for (
    const fonte
    of resultado.porProvedor
  ) {
    console.log("")
    console.log(
      fonte.provedor.toUpperCase()
    )

    console.log(
      `  Encontradas:           ${fonte.encontradas}`
    )

    console.log(
      `  Vagas válidas:         ${fonte.vagasValidas}`
    )

    console.log(
      `  Brasil:                ${fonte.compativeisBrasil}`
    )

    console.log(
      `  Fora do Brasil:        ${fonte.incompativeisBrasil}`
    )

    console.log(
      `  Indefinidas:           ${fonte.indefinidas}`
    )

    console.log(
      `  Ignoradas:             ${fonte.ignoradas}`
    )

    console.log(
      `  Falhas:                ${fonte.falhas}`
    )
  }
}

/**
 * Uso este diagnóstico para medir tanto a cobertura quanto a qualidade
 * da descoberta antes de permitir gravações automáticas no banco.
 */
async function executar() {
  console.log("")
  console.log(
    "Diagnosticando vagas encontradas na web..."
  )

  console.log("")
  console.log(
    "Nenhuma vaga será gravada no banco nesta execução."
  )

  console.log("")

  try {
    const resultado =
      await processarVagasWeb({
        salvarCompativeis:
          false
      })

    console.log("")
    console.log("Resumo")
    console.log("------")

    console.log(
      `Páginas descobertas:          ${resultado.paginasDescobertas}`
    )

    console.log(
      `Descartadas pelo título:      ${resultado.descartadasPorTitulo}`
    )

    console.log(
      `Páginas de listagem:          ${resultado.paginasDeListagem}`
    )

    console.log(
      `ATS para processamento:       ${resultado.paginasSelecionadas}`
    )

    console.log(
      `Somente descoberta:           ${resultado.paginasSomenteDescoberta}`
    )

    console.log(
      `Vagas extraídas:              ${resultado.vagasExtraidas}`
    )

    console.log(
      `Compatíveis com Brasil:       ${resultado.compativeisBrasil}`
    )

    console.log(
      `Fora do Brasil:               ${resultado.incompativeisBrasil}`
    )

    console.log(
      `Localização indefinida:       ${resultado.indefinidas}`
    )

    console.log(
      `Falhas:                       ${resultado.falhas}`
    )

    mostrarResumoPorProvedor(
      resultado
    )

    mostrarFontesSomenteDescoberta(
      resultado
    )

    mostrarPendencias(
      resultado,
      "extracao",
      "Problemas de extração"
    )

    mostrarPendencias(
      resultado,
      "indisponivel",
      "Publicações indisponíveis"
    )

    mostrarPendencias(
      resultado,
      "localizacao",
      "Localizações indefinidas"
    )

    mostrarPendencias(
      resultado,
      "acesso",
      "Falhas de acesso"
    )

    const arquivo =
      await salvarRelatorio(
        resultado
      )

    console.log("")
    console.log(
      "Relatório completo salvo localmente:"
    )

    console.log(
      arquivo
    )
  } catch (erro) {
    console.error("")
    console.error(
      "Falha durante o diagnóstico:",
      erro
    )

    process.exitCode = 1
  }
}

executar().catch(
  (erro) => {
    console.error("")
    console.error(
      "Falha inesperada durante o diagnóstico:",
      erro
    )

    process.exitCode = 1
  }
)