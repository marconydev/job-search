import "dotenv/config"

import { mkdir, writeFile } from "node:fs/promises"

import { resolve } from "node:path"

import { db } from "../database/connection.js"

import { obterPerfilProfissional } from "../services/perfil-profissional-service.js"

import { processarVagasWeb } from "../services/processamento-vagas-web.js"

async function salvarRelatorio(resultado: Awaited<ReturnType<typeof processarVagasWeb>>) {
  const diretorio = resolve(process.cwd(), ".cache")

  await mkdir(diretorio, {
    recursive: true
  })

  const arquivo = resolve(diretorio, "ultimo-diagnostico-web.json")

  await writeFile(
    arquivo,
    JSON.stringify(
      {
        geradoEm: new Date().toISOString(),

        resultado
      },
      null,
      2
    ),
    "utf8"
  )

  return arquivo
}

function mostrarFontesSomenteDescoberta(resultado: Awaited<ReturnType<typeof processarVagasWeb>>) {
  const grupos = new Map<string, typeof resultado.somenteDescoberta>()

  for (const pagina of resultado.somenteDescoberta) {
    const paginas = grupos.get(pagina.provedor) ?? []

    paginas.push(pagina)

    grupos.set(pagina.provedor, paginas)
  }

  console.log("")
  console.log("Fontes somente para descoberta")
  console.log("------------------------------")

  if (grupos.size === 0) {
    console.log("")
    console.log("Nenhuma página ficou somente na etapa de descoberta.")

    return
  }

  for (const [provedor, paginas] of grupos) {
    console.log("")

    console.log(`${provedor.toUpperCase()}: ${paginas.length}`)

    const limiteExibicao = provedor === "linkedin" || provedor === "indeed" ? 10 : 5

    for (const pagina of paginas.slice(0, limiteExibicao)) {
      console.log("")
      console.log(pagina.titulo)
      console.log(pagina.url)
      console.log(`Busca: ${pagina.consulta}`)
    }

    if (paginas.length > limiteExibicao) {
      console.log("")

      console.log(`... mais ${paginas.length - limiteExibicao} resultado(s) salvo(s) no relatório.`)
    }
  }
}

function mostrarRecomendacoesDescoberta(resultado: Awaited<ReturnType<typeof processarVagasWeb>>) {
  console.log("")
  console.log("Recomendações da descoberta")
  console.log("--------------------------")

  const recomendacoes = resultado.recomendacoesDescoberta.slice(0, 20)

  if (recomendacoes.length === 0) {
    console.log("")

    console.log("Nenhuma recomendação relevante foi encontrada no cache atual.")

    return
  }

  for (const vaga of recomendacoes) {
    console.log("")

    console.log(`[${vaga.pontuacao}%] ${vaga.titulo}`)

    console.log(`Origem: ${vaga.provedor}`)

    if (vaga.competencias.length > 0) {
      console.log(`Competências: ${vaga.competencias.join(", ")}`)
    }

    if (vaga.motivos.length > 0) {
      console.log(`Motivos: ${vaga.motivos.join(" | ")}`)
    }

    console.log(vaga.url)
  }

  if (resultado.recomendacoesDescoberta.length > recomendacoes.length) {
    console.log("")

    console.log(
      `... mais ${
        resultado.recomendacoesDescoberta.length - recomendacoes.length
      } recomendação(ões) salva(s) no relatório.`
    )
  }
}

function mostrarPendencias(
  resultado: Awaited<ReturnType<typeof processarVagasWeb>>,

  tipo: "extracao" | "indisponivel" | "localizacao" | "acesso",

  tituloSecao: string
) {
  const pendencias = resultado.pendencias.filter(pendencia => pendencia.tipo === tipo)

  console.log("")
  console.log(`${tituloSecao} (${pendencias.length})`)
  console.log("--------------------------------")

  if (pendencias.length === 0) {
    console.log("")
    console.log("Nenhum caso encontrado.")

    return
  }

  for (const pendencia of pendencias) {
    console.log("")

    console.log(`[${pendencia.provedor.toUpperCase()}] ${pendencia.titulo}`)

    if (tipo === "localizacao") {
      console.log(`Local: ${pendencia.localizacao ?? "não informado"}`)
    }

    console.log(`URL: ${pendencia.url}`)

    console.log(`Motivo: ${pendencia.motivo}`)
  }
}

function mostrarResumoPorProvedor(resultado: Awaited<ReturnType<typeof processarVagasWeb>>) {
  console.log("")
  console.log("Fontes processadas")
  console.log("------------------")

  if (resultado.porProvedor.length === 0) {
    console.log("")

    console.log("Nenhuma fonte estruturada foi processada.")

    return
  }

  for (const fonte of resultado.porProvedor) {
    console.log("")

    console.log(fonte.provedor.toUpperCase())

    console.log(`  Encontradas:           ${fonte.encontradas}`)

    console.log(`  Vagas válidas:         ${fonte.vagasValidas}`)

    console.log(`  Brasil:                ${fonte.compativeisBrasil}`)

    console.log(`  Fora do Brasil:        ${fonte.incompativeisBrasil}`)

    console.log(`  Indefinidas:           ${fonte.indefinidas}`)

    console.log(`  Importadas:            ${fonte.importadas}`)

    console.log(`  Duplicadas:            ${fonte.duplicadas}`)

    console.log(`  Dados incompletos:     ${fonte.semDadosObrigatorios}`)

    console.log(`  Ignoradas:             ${fonte.ignoradas}`)

    console.log(`  Falhas:                ${fonte.falhas}`)
  }
}

function devePermitirBuscaLive() {
  return process.argv.includes("--live")
}

function lerLimiteChamadasBrave() {
  const argumento = process.argv.find(item => item.startsWith("--limite="))

  if (!argumento) {
    return 6
  }

  const partes = argumento.split("=")

  const valor = Number(partes[1])

  if (!Number.isInteger(valor) || valor <= 0) {
    return 6
  }

  return Math.min(valor, 6)
}

/**
 * O diagnóstico continua seguro por padrão:
 *
 * - usa somente cache quando --live não está presente;
 * - não grava vagas;
 * - usa o mesmo perfil profissional persistido pela aplicação.
 */
async function executar() {
  const permitirBuscaLive = devePermitirBuscaLive()

  const limiteChamadasBrave = lerLimiteChamadasBrave()

  console.log("")
  console.log("Diagnosticando vagas encontradas na web...")
  console.log("")
  console.log("Nenhuma vaga será gravada no banco nesta execução.")
  console.log("")

  if (permitirBuscaLive) {
    console.log("Brave: modo live protegido")

    console.log(`Limite solicitado nesta execução: ${limiteChamadasBrave}`)

    console.log("O limite diário persistente continua sendo aplicado.")
  } else {
    console.log("Brave: desativada - usando somente cache")
  }

  console.log("")

  try {
    const dadosPerfil = await obterPerfilProfissional()

    const resultado = await processarVagasWeb(dadosPerfil.perfil, {
      salvarCompativeis: false,

      permitirBuscaLive,

      limiteChamadasBrave
    })

    console.log("")
    console.log("Resumo")
    console.log("------")

    console.log(`Páginas disponíveis:          ${resultado.paginasDescobertas}`)

    console.log(`Descartadas na triagem:       ${resultado.descartadasPorTitulo}`)

    console.log(`Páginas de listagem:          ${resultado.paginasDeListagem}`)

    console.log(`ATS para processamento:       ${resultado.paginasSelecionadas}`)

    console.log(`Somente descoberta:           ${resultado.paginasSomenteDescoberta}`)

    console.log(`Recomendações adicionais:     ${resultado.recomendacoesDescoberta.length}`)

    console.log(`Vagas extraídas:              ${resultado.vagasExtraidas}`)

    console.log(`Compatíveis com Brasil:       ${resultado.compativeisBrasil}`)

    console.log(`Fora do Brasil:               ${resultado.incompativeisBrasil}`)

    console.log(`Localização indefinida:       ${resultado.indefinidas}`)

    console.log(`Importadas:                   ${resultado.importadas}`)

    console.log(`Duplicadas:                   ${resultado.duplicadas}`)

    console.log(`Falhas:                       ${resultado.falhas}`)

    mostrarResumoPorProvedor(resultado)

    mostrarRecomendacoesDescoberta(resultado)

    mostrarFontesSomenteDescoberta(resultado)

    mostrarPendencias(resultado, "extracao", "Problemas de extração")

    mostrarPendencias(resultado, "indisponivel", "Publicações indisponíveis")

    mostrarPendencias(resultado, "localizacao", "Localizações indefinidas")

    mostrarPendencias(resultado, "acesso", "Falhas de acesso")

    const arquivo = await salvarRelatorio(resultado)

    console.log("")

    console.log("Relatório completo salvo localmente:")

    console.log(arquivo)

    console.log("")

    if (!permitirBuscaLive) {
      console.log("Nenhuma chamada à Brave foi realizada por este diagnóstico.")
    }
  } catch (erro) {
    console.error("")

    console.error("Falha durante o diagnóstico:", erro)

    process.exitCode = 1
  } finally {
    await db.end()
  }
}

executar().catch(erro => {
  console.error("")

  console.error("Falha inesperada durante o diagnóstico:", erro)

  process.exitCode = 1
})
