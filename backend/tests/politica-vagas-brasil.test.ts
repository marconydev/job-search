import assert from "node:assert/strict"
import test from "node:test"

import { avaliarPoliticaVagaBrasil, tituloEstaNoFocoBrasil } from "../src/services/politica-vagas-brasil.js"

test("título brasileiro está no foco", () => {
  assert.equal(tituloEstaNoFocoBrasil("Analista de Suporte"), true)
})

test("título em inglês não está no foco", () => {
  assert.equal(tituloEstaNoFocoBrasil("Technical Support Specialist"), false)
})

test("M3: presencial explícito fora de JP é vetado", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Analista de Suporte",
    location: "São Paulo, SP, Brasil",
    remote: false,
    workplaceType: "on-site"
  })
  assert.equal(r.permitida, false)
})

test("presencial inferido por UF específica fora de JP é vetado", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Analista de Suporte",
    location: "Teresópolis, Rio de Janeiro, Brasil",
    remote: false,
    workplaceType: "unknown"
  })
  assert.equal(r.permitida, false)
})

test("presencial inferido por estado extenso é vetado", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Analista de Suporte",
    location: "Belo Horizonte, Minas Gerais, Brasil",
    remote: false,
    workplaceType: null
  })
  assert.equal(r.permitida, false)
})

test("presencial em João Pessoa é aceito", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Analista de Suporte",
    location: "João Pessoa, PB, Brasil",
    remote: false,
    workplaceType: "on-site"
  })
  assert.equal(r.permitida, true)
})

test("presencial em Campina Grande é aceito", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Analista de Suporte",
    location: "Campina Grande, PB, Brasil",
    remote: false,
    workplaceType: "on-site"
  })
  assert.equal(r.permitida, true)
})

test("híbrida em qualquer lugar do Brasil é aceita", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Analista de Suporte",
    location: "São Paulo, SP, Brasil",
    remote: false,
    workplaceType: "hybrid"
  })
  assert.equal(r.permitida, true)
})

test("híbrida em Fortaleza é aceita", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Analista de Suporte",
    location: "Fortaleza, Ceará, Brasil",
    remote: false,
    workplaceType: "hybrid"
  })
  assert.equal(r.permitida, true)
})

test("presencial em Fortaleza é vetada", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Analista de Suporte",
    location: "Fortaleza, Ceará, Brasil",
    remote: false,
    workplaceType: "on-site"
  })
  assert.equal(r.permitida, false)
})

test("remota é aceita independente da cidade", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Analista de Suporte",
    location: "Porto Alegre, RS, Brasil",
    remote: true,
    workplaceType: "remote"
  })
  assert.equal(r.permitida, true)
})

test("location genérica (Brasil) com modalidade unknown é aceita", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Analista de Suporte",
    location: "Brasil",
    remote: false,
    workplaceType: "unknown"
  })
  assert.equal(r.permitida, true)
})

test("location null com modalidade unknown é aceita", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Analista de Suporte",
    location: null,
    remote: false,
    workplaceType: "unknown"
  })
  assert.equal(r.permitida, true)
})

test("location com 'remote' no texto é inferida como remota", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Analista de Suporte",
    location: "Remote - São Paulo",
    remote: false,
    workplaceType: "unknown"
  })
  assert.equal(r.permitida, true)
})

test("coordenador em JP é aceito", () => {
  const r = avaliarPoliticaVagaBrasil({
    title: "Coordenador de Service Desk",
    location: "João Pessoa, PB",
    remote: false,
    workplaceType: "on-site"
  })
  assert.equal(r.permitida, true)
})
