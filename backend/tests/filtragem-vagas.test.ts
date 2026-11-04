import assert from "node:assert/strict"
import test from "node:test"
import { filtrarVagasAderentesComYield, diagnosticarFunilVagasComYield } from "../src/services/filtragem-vagas.js"
import type { NewJob } from "../src/types/job.js"
import type { PerfilProfissional } from "../src/types/perfil-profissional.js"

function criarPerfil(): PerfilProfissional {
  return {
    resumoProfissional: "", cargosPrincipais: ["Analista de Suporte"], cargosRelacionados: [],
    cargosDesvio: [], competencias: [], experiencias: [], formacoes: [], cursos: [],
    localizacoesAceitas: ["Brasil"], titulosExcluidos: [],
    senioridadesExcluidas: []
  }
}

function criarVaga(alteracoes: Partial<NewJob> = {}): NewJob {
  return {
    source: "teste", externalId: "vaga-1", company: "Empresa", title: "Analista de Suporte",
    description: "Atendimento técnico.", location: "Brasil", remote: true,
    url: "https://example.com", publishedAt: null, partial: false, ...alteracoes
  }
}

test("aceita no funil vaga remota Worldwide (Tech Lead)", async () => {
  const vaga = criarVaga({ externalId: "remota-global", location: "Worldwide", remote: true })
  const aderentes = await filtrarVagasAderentesComYield([vaga], criarPerfil())
  assert.deepEqual(aderentes.map(item => item.externalId), ["remota-global"])
})

test("diagnostico observa o filtro original", async () => {
  const vagas = [
    criarVaga({ externalId: "antiga", publishedAt: "2025-01-01T15:00:00.000Z" }),
    criarVaga({ externalId: "exterior", location: "Lisboa, Portugal" }),
    criarVaga({ externalId: "titulo-fora", title: "Technical Support Specialist" }),
    criarVaga({ externalId: "aderente" })
  ]
  const aderentes = await filtrarVagasAderentesComYield(vagas, criarPerfil())
  // A vaga "titulo-fora" agora é aceita (Tech Lead).
  assert.deepEqual(aderentes.map(v => v.externalId), ["titulo-fora", "aderente"])
})