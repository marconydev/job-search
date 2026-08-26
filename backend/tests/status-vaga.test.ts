import assert from "node:assert/strict"
import test from "node:test"

import { isUserJobStatus } from "../src/services/status-vaga.js"

test("aceita somente estados manuais da oportunidade", () => {
  assert.equal(isUserJobStatus("relevant"), true)
  assert.equal(isUserJobStatus("applied"), true)
  assert.equal(isUserJobStatus("ignored"), true)
})

test("visualizacao e descarte automatico nao sao estados manuais", () => {
  assert.equal(isUserJobStatus("viewed"), false)
  assert.equal(isUserJobStatus("discarded"), false)
  assert.equal(isUserJobStatus(null), false)
  assert.equal(isUserJobStatus(123), false)
})
