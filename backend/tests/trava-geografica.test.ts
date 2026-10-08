import assert from "node:assert/strict"

import { describe, test } from "node:test"

import { avaliarElegibilidadeBrasil } from "../src/services/elegibilidade-localizacao.js"

describe("trava geográfica (diretiva v2)", () => {
  test("PRESENCIAL - São Paulo, SP deve ser INCOMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "São Paulo, SP",
      null,
      "Analista de Suporte",
      false,
      [],
      "on-site"
    )
    assert.equal(r.situacao, "incompativel")
  })

  test("PRESENCIAL - João Pessoa, PB deve ser COMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "João Pessoa, PB",
      null,
      "Analista de Suporte",
      false,
      [],
      "on-site"
    )
    assert.equal(r.situacao, "compativel")
  })

  test("PRESENCIAL - Campina Grande, PB deve ser INCOMPATÍVEL (Opção A / RMPJP estrita)", () => {
    const r = avaliarElegibilidadeBrasil(
      "Campina Grande, PB",
      null,
      "Analista de Suporte",
      false,
      [],
      "on-site"
    )
    assert.equal(r.situacao, "incompativel")
  })

  test("PRESENCIAL - Cabedelo (região metropolitana) deve ser COMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "Cabedelo, PB",
      null,
      "Analista de Suporte",
      false,
      [],
      "on-site"
    )
    assert.equal(r.situacao, "compativel")
  })

  test("HÍBRIDO - Recife, PE deve ser COMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "Recife, PE",
      null,
      "Analista de Suporte",
      false,
      [],
      "hybrid"
    )
    assert.equal(r.situacao, "compativel")
  })

  test("HÍBRIDO - São Paulo, SP deve ser COMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "São Paulo, SP",
      null,
      "Analista de Suporte",
      false,
      [],
      "hybrid"
    )
    assert.equal(r.situacao, "compativel")
  })

  test("HÍBRIDO - Brasil deve ser COMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "Brasil",
      null,
      "Analista de Suporte",
      false,
      [],
      "hybrid"
    )
    assert.equal(r.situacao, "compativel")
  })

  test("HÍBRIDO - Lisbon, Portugal deve ser INCOMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "Lisbon, Portugal",
      null,
      "Analista de Suporte",
      false,
      [],
      "hybrid"
    )
    assert.equal(r.situacao, "incompativel")
  })

  test("REMOTO - Lisbon, Portugal deve ser INCOMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "Lisbon, Portugal",
      null,
      "Analista de Suporte",
      true,
      [],
      "remote"
    )
    assert.equal(r.situacao, "incompativel")
  })

  test("REMOTO - LATAM deve ser INCOMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "LATAM",
      null,
      "Analista de Suporte",
      true,
      [],
      "remote"
    )
    assert.equal(r.situacao, "incompativel")
  })

  test("REMOTO - Global deve ser INCOMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "Global",
      null,
      "Analista de Suporte",
      true,
      [],
      "remote"
    )
    assert.equal(r.situacao, "incompativel")
  })

  test("REMOTO - Worldwide sem menção ao Brasil deve ser INCOMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "Worldwide",
      null,
      "Analista de Suporte",
      true,
      [],
      "remote"
    )
    assert.equal(r.situacao, "incompativel")
  })

  test("REMOTO - US (Remote) deve ser INCOMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "US (Remote)",
      null,
      "Analista de Suporte",
      true,
      [],
      "remote"
    )
    assert.equal(r.situacao, "incompativel")
  })

  test("REMOTO - Serbia | Global deve ser INCOMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "Serbia | Global",
      null,
      "Analista de Suporte",
      true,
      [],
      "remote"
    )
    assert.equal(r.situacao, "incompativel")
  })

  test("REMOTO - Estonia | Global deve ser INCOMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "Estonia | Global",
      null,
      "Analista de Suporte",
      true,
      [],
      "remote"
    )
    assert.equal(r.situacao, "incompativel")
  })

  test("REMOTO - EMEA deve ser INCOMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "EMEA",
      null,
      "Analista de Suporte",
      true,
      [],
      "remote"
    )
    assert.equal(r.situacao, "incompativel")
  })

  test("REMOTO - Brasil deve ser COMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "Brasil",
      null,
      "Analista de Suporte",
      true,
      [],
      "remote"
    )
    assert.equal(r.situacao, "compativel")
  })

  test("REMOTO - Brazil - Remote deve ser COMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "Brazil - Remote",
      null,
      "Analista de Suporte",
      true,
      [],
      "remote"
    )
    assert.equal(r.situacao, "compativel")
  })

  test("REMOTO - Worldwide com descrição indicando Brasil deve ser COMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "Worldwide",
      "Work location: Brazil - Remote",
      "Analista de Suporte",
      true,
      [],
      "remote"
    )
    assert.equal(r.situacao, "compativel")
  })

  test("REMOTO - Global com descrição indicando Brasil deve ser COMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "Global",
      "This position is based in Brazil.",
      "Analista de Suporte",
      true,
      [],
      "remote"
    )
    assert.equal(r.situacao, "compativel")
  })

  test("PRESENCIAL - 'João Pessoa' sem UF deve ser COMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "João Pessoa",
      null,
      "Analista de Suporte",
      false,
      [],
      "on-site"
    )
    assert.equal(r.situacao, "compativel")
  })

  test("PRESENCIAL - 'JPA' deve ser COMPATÍVEL", () => {
    const r = avaliarElegibilidadeBrasil(
      "JPA",
      null,
      "Analista de Suporte",
      false,
      [],
      "on-site"
    )
    assert.equal(r.situacao, "compativel")
  })
})


describe("trava geográfica — cenários mínimos do ajuste 6", () => {
  test("cidade fora + unknown sem sinal — descarta (inferida)", () => {
    const r = avaliarElegibilidadeBrasil("Blumenau, SC", null, "Analista de Suporte", false, [], null)
    assert.equal(r.situacao, "incompativel")
    assert.equal(r.inferida, true)
  })

  test("cidade fora + 'remoto' na descrição — mantém", () => {
    const r = avaliarElegibilidadeBrasil(
      "Blumenau, SC",
      "Atuação totalmente remota em suporte técnico.",
      "Analista de Suporte",
      true,
      [],
      null
    )
    assert.equal(r.situacao, "compativel")
  })

  test("cidade da zona + unknown — mantém", () => {
    const r = avaliarElegibilidadeBrasil("João Pessoa, PB", null, "Analista de Suporte", false, [], null)
    assert.equal(r.situacao, "compativel")
  })

  test("'Brazil' sozinho — não infere on-site", () => {
    const r = avaliarElegibilidadeBrasil("Brazil", null, "Analista de Suporte", false, [], null)
    assert.notEqual(r.situacao, "incompativel")
  })

  test("'Paraíba' sozinho (só estado) — não infere on-site", () => {
    const r = avaliarElegibilidadeBrasil("Paraíba", null, "Analista de Suporte", false, [], null)
    assert.notEqual(r.situacao, "incompativel")
  })

  test("localização nula — revisar", () => {
    const r = avaliarElegibilidadeBrasil(null, null, "Analista de Suporte", false, [], null)
    assert.equal(r.situacao, "indefinida")
  })

  test("híbrido na zona — mantém", () => {
    const r = avaliarElegibilidadeBrasil("João Pessoa, PB", null, "Analista de Suporte", false, [], "hybrid")
    assert.equal(r.situacao, "compativel")
  })
})


describe("matriz de 4 pontos da diretiva", () => {
  test("Regra 1: Remoto em qualquer lugar do Brasil -> APROVADO", () => {
    assert.equal(avaliarElegibilidadeBrasil("Brasil", null, "Analista", true, [], "remote").situacao, "compativel")
    assert.equal(avaliarElegibilidadeBrasil("Sao Paulo, SP", null, "Analista", true, [], "remote").situacao, "compativel")
    assert.equal(avaliarElegibilidadeBrasil("Recife, PE", null, "Analista", true, [], "remote").situacao, "compativel")
    assert.equal(avaliarElegibilidadeBrasil("Manaus, AM", null, "Analista", true, [], "remote").situacao, "compativel")
  })

  test("Regra 2: Hibrido em qualquer lugar do Brasil -> APROVADO", () => {
    assert.equal(avaliarElegibilidadeBrasil("Sao Paulo, SP", null, "Analista", false, [], "hybrid").situacao, "compativel")
    assert.equal(avaliarElegibilidadeBrasil("Recife, PE", null, "Analista", false, [], "hybrid").situacao, "compativel")
    assert.equal(avaliarElegibilidadeBrasil("Joao Pessoa, PB", null, "Analista", false, [], "hybrid").situacao, "compativel")
    assert.equal(avaliarElegibilidadeBrasil("Brasil", null, "Analista", false, [], "hybrid").situacao, "compativel")
  })

  test("Regra 3: vaga de outro pais (remota, hibrida ou presencial) -> BLOQUEIO", () => {
    assert.equal(avaliarElegibilidadeBrasil("Lisboa, Portugal", null, "Analista", true, [], "remote").situacao, "incompativel")
    assert.equal(avaliarElegibilidadeBrasil("US (Remote)", null, "Analista", true, [], "remote").situacao, "incompativel")
    assert.equal(avaliarElegibilidadeBrasil("Serbia | Global", null, "Analista", true, [], "remote").situacao, "incompativel")
    assert.equal(avaliarElegibilidadeBrasil("Global", null, "Analista", true, [], "remote").situacao, "incompativel")
    assert.equal(avaliarElegibilidadeBrasil("LATAM", null, "Analista", true, [], "remote").situacao, "incompativel")
    assert.equal(avaliarElegibilidadeBrasil("Worldwide", null, "Analista", true, [], "remote").situacao, "incompativel")
    assert.equal(avaliarElegibilidadeBrasil("London", null, "Analista", false, [], "hybrid").situacao, "incompativel")
    assert.equal(avaliarElegibilidadeBrasil("New York, NY", null, "Analista", false, [], "on-site").situacao, "incompativel")
  })

  test("Regra 4: Presencial fora de Joao Pessoa e regiao -> BLOQUEIO", () => {
    assert.equal(avaliarElegibilidadeBrasil("Sao Paulo, SP", null, "Analista", false, [], "on-site").situacao, "incompativel")
    assert.equal(avaliarElegibilidadeBrasil("Recife, PE", null, "Analista", false, [], "on-site").situacao, "incompativel")
    assert.equal(avaliarElegibilidadeBrasil("Campina Grande, PB", null, "Analista", false, [], "on-site").situacao, "incompativel")
    assert.equal(avaliarElegibilidadeBrasil("Patos, PB", null, "Analista", false, [], "on-site").situacao, "incompativel")
  })
})

describe("Opcao 2 - bandeira estrangeira vence localizacoesAceitas", () => {
  const perfilAmplo = ["worldwide", "anywhere", "global", "brazil", "brasil", "latinamerica", "latam", "south america", "americas"]

  test("'Serbia | Global' com perfil contendo 'global' continua INCOMPATIVEL", () => {
    assert.equal(
      avaliarElegibilidadeBrasil("Serbia | Global", null, "Analista", true, perfilAmplo, "remote").situacao,
      "incompativel"
    )
  })

  test("'Global' puro com perfil contendo 'global' agora e INCOMPATIVEL", () => {
    assert.equal(
      avaliarElegibilidadeBrasil("Global", null, "Analista", true, perfilAmplo, "remote").situacao,
      "incompativel"
    )
  })

  test("'Worldwide' com perfil contendo 'worldwide' agora e INCOMPATIVEL", () => {
    assert.equal(
      avaliarElegibilidadeBrasil("Worldwide", null, "Analista", true, perfilAmplo, "remote").situacao,
      "incompativel"
    )
  })

  test("'LATAM' com perfil contendo 'latam' agora e INCOMPATIVEL", () => {
    assert.equal(
      avaliarElegibilidadeBrasil("LATAM", null, "Analista", true, perfilAmplo, "remote").situacao,
      "incompativel"
    )
  })

  test("'Americas' com perfil contendo 'americas' agora e INCOMPATIVEL", () => {
    assert.equal(
      avaliarElegibilidadeBrasil("Americas", null, "Analista", true, perfilAmplo, "remote").situacao,
      "incompativel"
    )
  })

  test("'Brazil' com perfil contendo 'brasil' continua COMPATIVEL", () => {
    assert.equal(
      avaliarElegibilidadeBrasil("Brazil", null, "Analista", true, ["brasil", "brazil"], "remote").situacao,
      "compativel"
    )
  })

  test("cidade customizada nao-bandeira continua COMPATIVEL", () => {
    assert.equal(
      avaliarElegibilidadeBrasil("Vila Nova", null, "Analista", false, ["vila nova"], null).situacao,
      "compativel"
    )
  })
})
