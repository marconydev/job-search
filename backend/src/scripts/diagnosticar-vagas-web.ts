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

/**
 * Salvo o diagnóstico completo para conseguir revisar as oportunidades
 * encontradas sem precisar executar novamente uma busca na Brave.
 */
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

/**
 * Agrupo as páginas que ainda não possuem extração estruturada.
 *
 * Essas oportunidades não são descartadas. Elas continuam disponíveis
 * para análise pelo matcher usando título e descrição curta.
 */
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

  if (
    grupos.size === 0
  ) {
    console.log("")
    console.log(
      "Nenhuma página ficou somente na etapa de descoberta."
    )

    return
  }

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

    /**
     * Não mostro todas as páginas no terminal porque algumas fontes
     * podem possuir dezenas de resultados.
     *
     * O relatório JSON continua guardando o conteúdo completo.
     */
    const limiteExibicao =
      provedor === "linkedin" ||
      provedor === "indeed"
        ? 10
        : 5

    for (
      const pagina
      of paginas.slice(
        0,
        limiteExibicao
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
      limiteExibicao
    ) {
      console.log("")

      console.log(
        `... mais ${
          paginas.length -
          limiteExibicao
        } resultado(s) salvo(s) no relatório.`
      )
    }
  }
}

/**
 * Mostro as melhores oportunidades encontradas mesmo quando ainda não
 * consegui extrair completamente a página.
 *
 * Uso a mesma pontuação do matcher principal para não manter dois
 * sistemas diferentes de compatibilidade.
 */
function mostrarRecomendacoesDescoberta(
  resultado: Awaited<
    ReturnType<typeof processarVagasWeb>
  >
) {
  console.log("")
  console.log(
    "Recomendações da descoberta"
  )

  console.log(
    "--------------------------"
  )

  const recomendacoes =
    resultado
      .recomendacoesDescoberta
      .slice(
        0,
        20
      )

  if (
    recomendacoes.length ===
    0
  ) {
    console.log("")
    console.log(
      "Nenhuma recomendação relevante foi encontrada no cache atual."
    )

    return
  }

  for (
    const vaga
    of recomendacoes
  ) {
    console.log("")

    console.log(
      `[${vaga.pontuacao}%] ${vaga.titulo}`
    )

    console.log(
      `Origem: ${vaga.provedor}`
    )

    if (
      vaga.competencias.length >
      0
    ) {
      console.log(
        `Competências: ${vaga.competencias.join(", ")}`
      )
    }

    if (
      vaga.motivos.length >
      0
    ) {
      console.log(
        `Motivos: ${vaga.motivos.join(" | ")}`
      )
    }

    console.log(
      vaga.url
    )
  }

  if (
    resultado
      .recomendacoesDescoberta
      .length >
    recomendacoes.length
  ) {
    console.log("")

    console.log(
      `... mais ${
        resultado
          .recomendacoesDescoberta
          .length -
        recomendacoes.length
      } recomendação(ões) salva(s) no relatório.`
    )
  }
}

/**
 * Mostro as pendências agrupadas por tipo.
 */
function mostrarPendencias(
  resultado: Awaited<
    ReturnType<typeof processarVagasWeb>
  >,

  tipo:
    | "extracao"
    | "indisponivel"
    | "localizacao"
    | "acesso",

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
    pendencias.length ===
    0
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
      tipo ===
      "localizacao"
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

/**
 * Mostro somente as plataformas que passaram pela extração estruturada.
 */
function mostrarResumoPorProvedor(
  resultado: Awaited<
    ReturnType<typeof processarVagasWeb>
  >
) {
  console.log("")
  console.log(
    "Fontes processadas"
  )

  console.log(
    "------------------"
  )

  if (
    resultado
      .porProvedor
      .length === 0
  ) {
    console.log("")
    console.log(
      "Nenhuma fonte estruturada foi processada."
    )

    return
  }

  for (
    const fonte
    of resultado.porProvedor
  ) {
    console.log("")

    console.log(
      fonte.provedor
        .toUpperCase()
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
      `  Importadas:            ${fonte.importadas}`
    )

    console.log(
      `  Duplicadas:            ${fonte.duplicadas}`
    )

    console.log(
      `  Dados incompletos:     ${fonte.semDadosObrigatorios}`
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
 * Verifico se solicitei explicitamente uma atualização pela Brave.
 *
 * Sem --live o diagnóstico trabalha exclusivamente com cache e não
 * realiza nenhuma chamada ao mecanismo de busca.
 */
function devePermitirBuscaLive() {
  return process.argv.includes(
    "--live"
  )
}

/**
 * Permito reduzir ainda mais o limite de chamadas quando necessário.
 *
 * Exemplos:
 *
 * npm run diagnose -- --live
 *
 * npm run diagnose -- --live --limite=2
 *
 * Mesmo que seja informado um número maior, o serviço de descoberta
 * continua aplicando a proteção diária configurada no projeto.
 */
function lerLimiteChamadasBrave() {
  const argumento =
    process.argv.find(
      (item) =>
        item.startsWith(
          "--limite="
        )
    )

  if (!argumento) {
    return 6
  }

  const partes =
    argumento.split("=")

  const valor =
    Number(
      partes[1]
    )

  if (
    !Number.isInteger(
      valor
    ) ||
    valor <= 0
  ) {
    return 6
  }

  return Math.min(
    valor,
    6
  )
}

/**
 * Executo o diagnóstico em modo seguro.
 *
 * Por padrão:
 *
 * - não uso Brave;
 * - não salvo vagas no PostgreSQL;
 * - não altera o matcher persistido;
 * - usa somente dados encontrados anteriormente.
 *
 * A opção --live precisa ser informada explicitamente para permitir
 * novas chamadas à Brave.
 */
async function executar() {
  const permitirBuscaLive =
    devePermitirBuscaLive()

  const limiteChamadasBrave =
    lerLimiteChamadasBrave()

  console.log("")
  console.log(
    "Diagnosticando vagas encontradas na web..."
  )

  console.log("")

  console.log(
    "Nenhuma vaga será gravada no banco nesta execução."
  )

  console.log("")

  if (
    permitirBuscaLive
  ) {
    console.log(
      "Brave: modo live protegido"
    )

    console.log(
      `Limite solicitado nesta execução: ${limiteChamadasBrave}`
    )

    console.log(
      "O limite diário persistente continua sendo aplicado."
    )
  } else {
    console.log(
      "Brave: desativada - usando somente cache"
    )
  }

  console.log("")

  try {
    const resultado =
      await processarVagasWeb({
        salvarCompativeis:
          false,

        permitirBuscaLive,

        limiteChamadasBrave
      })

    console.log("")
    console.log(
      "Resumo"
    )

    console.log(
      "------"
    )

    console.log(
      `Páginas disponíveis:          ${resultado.paginasDescobertas}`
    )

    console.log(
      `Descartadas na triagem:       ${resultado.descartadasPorTitulo}`
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
      `Recomendações adicionais:     ${resultado.recomendacoesDescoberta.length}`
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
      `Importadas:                   ${resultado.importadas}`
    )

    console.log(
      `Duplicadas:                   ${resultado.duplicadas}`
    )

    console.log(
      `Falhas:                       ${resultado.falhas}`
    )

    mostrarResumoPorProvedor(
      resultado
    )

    /**
     * Mostro primeiro as recomendações porque elas são o resultado mais
     * importante para o uso prático do Job Search.
     */
    mostrarRecomendacoesDescoberta(
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

    console.log("")

    if (
      !permitirBuscaLive
    ) {
      console.log(
        "Nenhuma chamada à Brave foi realizada por este diagnóstico."
      )
    }
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