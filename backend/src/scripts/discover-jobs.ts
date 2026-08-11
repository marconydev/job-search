import "dotenv/config"

import { descobrirPaginasVagas } from "../services/job-discovery.js"
import type { ProvedorPagina } from "../types/discovery.js"

const rotulosProvedores: Record<ProvedorPagina, string> = {
  gupy: "Gupy",
  linkedin: "LinkedIn",
  lever: "Lever",
  greenhouse: "Greenhouse",
  workable: "Workable",
  smartrecruiters: "SmartRecruiters",
  indeed: "Indeed",
  "remote-ok": "Remote OK",
  remotive: "Remotive",
  "career-page": "Páginas próprias",
  aggregator: "Agregadores",
  unknown: "Desconhecidas"
}

/**
 * Crio o contador a partir da própria lista de provedores para não
 * precisar manter duas estruturas separadas sempre que adicionar
 * uma nova fonte.
 */
function criarContadorProvedores(): Record<ProvedorPagina, number> {
  return Object.fromEntries(
    Object.keys(rotulosProvedores).map((provedor) => [
      provedor,
      0
    ])
  ) as Record<ProvedorPagina, number>
}

/**
 * Agrupo as páginas por origem para entender melhor de onde estão
 * vindo os resultados encontrados nas buscas.
 */
function contarPorProvedor(
  paginas: Awaited<ReturnType<typeof descobrirPaginasVagas>>
) {
  const contagens = criarContadorProvedores()

  for (const pagina of paginas) {
    contagens[pagina.provider]++
  }

  return contagens
}

/**
 * Executo a descoberta pela web e mostro primeiro um resumo das fontes.
 *
 * Ainda não salvo essas páginas no banco. Primeiro quero confirmar
 * a origem e a qualidade dos resultados encontrados.
 */
async function executar() {
  console.log("Buscando páginas de vagas na web...")

  try {
    const paginas = await descobrirPaginasVagas()
    const contagens = contarPorProvedor(paginas)

    console.log("")
    console.log(`Páginas encontradas: ${paginas.length}`)
    console.log("")

    console.log("Fontes identificadas")
    console.log("--------------------")

    for (
      const [provedor, rotulo] of Object.entries(rotulosProvedores)
    ) {
      const quantidade = contagens[provedor as ProvedorPagina]

      console.log(`${rotulo.padEnd(18)} ${quantidade}`)
    }

    console.log("")
    console.log("Resultados")
    console.log("----------")

    for (const pagina of paginas) {
      console.log("")
      console.log(
        `[${rotulosProvedores[pagina.provider]}] ${pagina.title}`
      )
      console.log(pagina.url)
      console.log(`Busca: ${pagina.query}`)
    }
  } catch (erro) {
    console.error("Falha durante a busca na web:", erro)

    // Deixo um código de saída diferente de zero para conseguir detectar
    // falhas quando essa execução passar a rodar automaticamente.
    process.exitCode = 1
  }
}

executar()