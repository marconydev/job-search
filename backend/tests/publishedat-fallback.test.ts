import assert from "node:assert/strict"
import test from "node:test"
import { converterVagaWebParaNovaVaga } from "../src/services/conversao-vaga-web.js"

const p = (e: any = {}) => ({ provedor: "linkedin", url: "https://br.linkedin.com/jobs/view/abc", titulo: "Analista de Suporte", descricao: "desc", consulta: "q", ...e })
const v = (e: any = {}) => ({ titulo: "Analista de Suporte", empresa: "Emp", descricao: "desc", localizacao: null, tipoContratacao: null, dataPublicacao: null, validaAte: null, remoto: false, urlCandidatura: "https://br.linkedin.com/jobs/view/abc", ...e })

test("usa publishedAtEstimado quando dataPublicacao e null", () => {
  const r = converterVagaWebParaNovaVaga(p({ publishedAtEstimado: "2026-10-15T00:00:00Z" }) as any, v() as any, "https://br.linkedin.com/jobs/view/abc")
  assert.equal(r && r.publishedAt, "2026-10-15T00:00:00Z")
})

test("prefere dataPublicacao quando disponivel", () => {
  const r = converterVagaWebParaNovaVaga(p({ publishedAtEstimado: "2026-10-15T00:00:00Z" }) as any, v({ dataPublicacao: "2026-10-17T12:00:00Z" }) as any, "https://br.linkedin.com/jobs/view/abc")
  assert.equal(r && r.publishedAt, "2026-10-17T12:00:00Z")
})
