import assert from "node:assert/strict"

import test from "node:test"

import { interpretarDataPtBr } from "../src/collectors/collector-utils.js"

import { normalizarVagaGetOnBoard } from "../src/collectors/getonboard.js"

import { parseGeekHunterHtml } from "../src/collectors/geekhunter.js"

import { parseVagasComHtml } from "../src/collectors/vagas-com.js"

const AGORA = new Date("2026-08-26T15:00:00.000Z")

test("interpreta datas relativas e absolutas em pt-BR", () => {
  assert.equal(interpretarDataPtBr("Publicada há 3 dias", AGORA), "2026-08-23T15:00:00.000Z")

  assert.equal(interpretarDataPtBr("Publicada em 23/08/2026", AGORA), "2026-08-23T12:00:00.000Z")

  assert.equal(interpretarDataPtBr("Ontem", AGORA), "2026-08-25T15:00:00.000Z")
})

test("GetOnBoard prioriza modalidade estruturada sobre booleano remoto", () => {
  const vaga = normalizarVagaGetOnBoard({
    id: "analista-suporte-123",

    attributes: {
      title: "Analista de Suporte",

      description: "<p>Atendimento aos usuários e sistemas.</p>",

      functions: "<p>Gestão de incidentes e chamados.</p>",

      remote: true,

      remote_modality: "hybrid",

      countries: ["Brasil"],

      published_at: 1_777_000_000,

      company: {
        data: {
          id: 10,

          attributes: {
            name: "Empresa Teste"
          }
        }
      }
    }
  })

  assert.ok(vaga)

  assert.equal(vaga.company, "Empresa Teste")

  assert.equal(vaga.remote, false)

  assert.equal(vaga.location, "Brasil")

  assert.match(vaga.description, /Gestão de incidentes/)
})

test("Vagas.com reconhece modalidade remota somente pelo rótulo do portal", () => {
  const html = `
    <ul>
      <li class="vaga" id="id_vaga_123456">
        <h2>
          <a
            class="link-detalhes-vaga"
            href="/vagas/v123456/analista-de-suporte"
          >
            Analista de Suporte
          </a>
        </h2>

        <span class="emprVaga">
          Empresa Brasileira
        </span>

        <div class="detalhes">
          Atendimento técnico e gestão de incidentes.
        </div>

        <div class="infoVaga">
          Brasil
          100% Home Office
          Publicada há 3 dias
        </div>
      </li>
    </ul>
  `

  const vagas = parseVagasComHtml(html, AGORA)

  assert.equal(vagas.length, 1)

  const vaga = vagas[0]

  assert.equal(vaga.externalId, "123456")

  assert.equal(vaga.company, "Empresa Brasileira")

  assert.equal(vaga.remote, true)

  assert.equal(vaga.location, "Brasil")

  assert.equal(vaga.publishedAt, "2026-08-23T15:00:00.000Z")
})

test("GeekHunter extrai vaga remota e data real de publicacao", () => {
  const html = `
    <article>
      <a href="/pt/code-group-123/jobs/analista-de-service-desk">
        <h2>
          Analista de Service Desk
        </h2>
      </a>

      <div>
        Publicada há 2 dias
      </div>

      <div>
        Remoto
      </div>

      <section>
        Tarefas e Responsabilidades

        Atendimento de chamados,
        suporte técnico e gestão de incidentes.

        Requisitos

        Conhecimento em Service Desk.
      </section>
    </article>
  `

  const vagas = parseGeekHunterHtml(html, AGORA)

  assert.equal(vagas.length, 1)

  const vaga = vagas[0]

  assert.equal(vaga.company, "Code Group")

  assert.equal(vaga.remote, true)

  assert.equal(vaga.location, "Brasil")

  assert.equal(vaga.publishedAt, "2026-08-24T15:00:00.000Z")

  assert.match(vaga.description, /suporte técnico/i)
})

test("GeekHunter nao transforma data de atualizacao em publicacao", () => {
  const html = `
    <article>
      <a href="/pt/empresa-teste-98/jobs/analista-de-infraestrutura">
        Analista de Infraestrutura
      </a>

      <div>
        Atualizada há 1 hora
      </div>

      <div>
        Híbrido
        João Pessoa, PB, Brasil
      </div>

      <section>
        Tarefas e Responsabilidades

        Administração de redes e servidores.

        Requisitos

        Active Directory e Windows Server.
      </section>
    </article>
  `

  const vagas = parseGeekHunterHtml(html, AGORA)

  assert.equal(vagas.length, 1)

  const vaga = vagas[0]

  assert.equal(vaga.remote, false)

  assert.equal(vaga.location, "João Pessoa, PB, Brasil")

  assert.equal(vaga.publishedAt, null)
})
