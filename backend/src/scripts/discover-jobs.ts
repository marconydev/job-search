import "dotenv/config"

import {
  descobrirPaginasVagas
} from "../services/job-discovery.js"

import type {
  ProvedorPagina
} from "../types/discovery.js"

const rotulosProvedores: Record<
  ProvedorPagina,
  string
> = {
  gupy: "Gupy",
  linkedin: "LinkedIn",
  lever: "Lever",
  greenhouse: "Greenhouse",
  workable: "Workable",
  smartrecruiters: "SmartRecruiters",
  indeed: "Indeed",
  "remote-ok": "Remote OK",
  remotive: "Remotive",
  "pagina-propria": "Páginas próprias",
  agregador: "Agregadores",
  desconhecido: "Desconhecidas"
}

/**
 * Crio o contador usando a própria lista de provedores para não
 * manter duas estruturas diferentes sempre que adicionar uma fonte.
 */
function criarContadorProvedores(): Record<
  ProvedorPagina,
  number
> {
  return Object.fromEntries(
    Object.keys(rotulosProvedores).map(
      (provedor) => [
        provedor,
        0
      ]
    )
  ) as Record<ProvedorPagina, number>
}

/**
 * Agrupo os resultados por origem para entender de onde estão vindo
 * as páginas encontradas nas pesquisas.
 */
function contarPorProvedor(
  paginas: Awaited<
    ReturnType<typeof descobrirPaginasVagas>
  >
) {
  const contagens =
    criarContadorProvedores()

  for (const pagina of paginas) {
    contagens[pagina.provedor]++
  }

  return contagens
}

/**
 * Executo a descoberta pela web e mostro um resumo antes dos resultados.
 *
 * Ainda não salvo essas páginas no banco porque primeiro preciso
 * confirmar que realmente representam oportunidades válidas.
 */
async function executar() {
  console.log(
    "Buscando páginas de vagas na web..."
  )

  try {
    const paginas =
      await descobrirPaginasVagas()

    const contagens =
      contarPorProvedor(paginas)

    console.log("")
    console.log(
      `Páginas encontradas: ${paginas.length}`
    )
    console.log("")

    console.log("Fontes identificadas")
    console.log("--------------------")

    for (
      const [provedor, rotulo]
      of Object.entries(rotulosProvedores)
    ) {
      const quantidade =
        contagens[
          provedor as ProvedorPagina
        ]

      console.log(
        `${rotulo.padEnd(18)} ${quantidade}`
      )
    }

    console.log("")
    console.log("Resultados")
    console.log("----------")

    for (const pagina of paginas) {
      console.log("")

      console.log(
        `[${rotulosProvedores[pagina.provedor]}] ${pagina.titulo}`
      )

      console.log(pagina.url)

      console.log(
        `Busca: ${pagina.consulta}`
      )
    }
  } catch (erro) {
    console.error(
      "Falha durante a busca na web:",
      erro
    )

    // Deixo o código de saída diferente de zero para conseguir detectar
    // falhas quando essa execução passar a rodar automaticamente.
    process.exitCode = 1
  }
}

executar()