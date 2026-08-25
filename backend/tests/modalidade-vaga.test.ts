import assert from "node:assert/strict"

import { describe, test } from "node:test"

import {
  interpretarModalidadeEstruturada,
  trabalhoEhRemotoPorFonteEstruturada
} from "../src/services/modalidade-vaga.js"

describe("modalidade estruturada da vaga", () => {
  test("considera remote como trabalho remoto", () => {
    assert.equal(trabalhoEhRemotoPorFonteEstruturada("remote"), true)
  })

  test("considera TELECOMMUTE do schema.org como trabalho remoto", () => {
    assert.equal(interpretarModalidadeEstruturada("TELECOMMUTE"), "remote")
  })

  test("não considera hybrid como trabalho remoto", () => {
    assert.equal(trabalhoEhRemotoPorFonteEstruturada("hybrid"), false)
  })

  test("não considera on-site como trabalho remoto", () => {
    assert.equal(trabalhoEhRemotoPorFonteEstruturada("on-site"), false)
  })

  test("campo estruturado on-site prevalece sobre indicador legado remoto", () => {
    assert.equal(trabalhoEhRemotoPorFonteEstruturada("on-site", true), false)
  })

  test("campo estruturado hybrid prevalece sobre indicador legado remoto", () => {
    assert.equal(trabalhoEhRemotoPorFonteEstruturada("hybrid", true), false)
  })

  test("usa indicador legado quando modalidade estruturada está ausente", () => {
    assert.equal(trabalhoEhRemotoPorFonteEstruturada(undefined, true), true)

    assert.equal(trabalhoEhRemotoPorFonteEstruturada(undefined, false), false)
  })

  test("modalidade estruturada desconhecida não é presumida como remota", () => {
    assert.equal(trabalhoEhRemotoPorFonteEstruturada("field", true), false)
  })
})
