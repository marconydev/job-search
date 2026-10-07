import assert from "node:assert/strict"

import test from "node:test"

import {
  gerarTermosBuscaPortugues,
  interpretarDataPtBr
} from "../src/collectors/collector-utils.js"

import { montarUrlBuscaGetOnBoard, normalizarVagaGetOnBoard } from "../src/collectors/getonboard.js"

import { parseGeekHunterHtml } from "../src/collectors/geekhunter.js"

import { montarUrlBuscaJobicy } from "../src/collectors/jobicy.js"

import { montarUrlBuscaVagasCom, parseVagasComHtml } from "../src/collectors/vagas-com.js"

import type { PerfilProfissional } from "../src/types/perfil-profissional.js"

const AGORA = new Date("2026-08-26T15:00:00.000Z")

function criarPerfilComAliasesIngles(): PerfilProfissional {
  return {
    resumoProfissional: "",

    cargosPrincipais: [
      "Analista de Suporte",
      "Technical Support",
      "Analista de Sistemas",
      "Application Support"
    ],

    cargosRelacionados: ["Support Analyst", "NOC Analyst", "BI Analyst"],

    cargosDesvio: [],

    competencias: [],

    experiencias: [],

    formacoes: [],

    cursos: [],

    localizacoesAceitas: ["Brasil"],

    titulosExcluidos: []
  }
}

test("gera termos com cargos do perfil, inclusive aliases em inglês (M2)", () => {
  const termos = gerarTermosBuscaPortugues(criarPerfilComAliasesIngles(), 10)

  assert.ok(termos.includes("Analista de Suporte"))
  assert.ok(termos.includes("Analista de Sistemas"))
  assert.ok(termos.includes("Technical Support"))
  assert.ok(termos.includes("Application Support"))
  assert.ok(termos.includes("Support Analyst"))
  assert.ok(termos.includes("NOC Analyst"))
  assert.ok(termos.includes("BI Analyst"))
})

test("monta a busca do GetOnBoard com parâmetros compatíveis e termo em português", () => {
  const url = montarUrlBuscaGetOnBoard("Analista de Suporte", 1, 100)

  assert.equal(url.searchParams.get("query"), "Analista de Suporte")

  assert.equal(url.searchParams.get("country"), "br")

  assert.equal(url.searchParams.get("country_code"), null)

  assert.deepEqual(url.searchParams.getAll("expand[]"), ["company"])

  assert.equal(url.searchParams.get("lang"), "pt")

  assert.equal(url.searchParams.get("per_page"), "25")
})

test("direciona a Jobicy para vagas remotas elegíveis no Brasil", () => {
  const url = montarUrlBuscaJobicy(100)

  assert.equal(url.origin + url.pathname, "https://jobicy.com/api/v2/remote-jobs")

  assert.equal(url.searchParams.get("geo"), "brazil")

  assert.equal(url.searchParams.get("count"), "100")
})

test("respeita o limite máximo público da Jobicy", () => {
  const url = montarUrlBuscaJobicy(500)

  assert.equal(url.searchParams.get("count"), "200")

  assert.equal(url.searchParams.get("geo"), "brazil")
})

test("monta a paginação do Vagas.com com termo em português", () => {
  const url = montarUrlBuscaVagasCom("Analista de Suporte", 2)

  assert.ok(url)

  if (!url) {
    return
  }

  assert.equal(url.pathname, "/vagas-de-analista-de-suporte")

  assert.equal(url.searchParams.get("ordenar_por"), "mais_recentes")

  assert.equal(url.searchParams.get("pagina"), "2")
})

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

  if (!vaga) {
    return
  }

  assert.equal(vaga.company, "Empresa Teste")

  assert.equal(vaga.remote, false)

  assert.equal(vaga.location, "Brasil")

  assert.match(vaga.description, /Gestão de incidentes/)
})

test("Vagas.com usa os campos semânticos do card sem poluir o título", () => {
  const html = `
      <ul>
        <li class="vaga" id="id_vaga_123456">
          <h2 class="cargo">
            <a
              class="link-detalhes-vaga"
              data-id-vaga="123456"
              title="Analista de Suporte"
              href="/vagas/v123456/analista-de-suporte"
            >
              Vaga Analista de Suporte - Empresa Brasileira | Vagas.com
            </a>
          </h2>

          <span class="emprVaga">
            Empresa Brasileira
          </span>

          <div class="detalhes">
            Atendimento técnico e gestão de incidentes.
          </div>

          <div class="vaga-local">
            100% Home Office
          </div>

          <span class="data-publicacao">
            Há 3 dias
          </span>
        </li>
      </ul>
    `

  const vagas = parseVagasComHtml(html, AGORA)

  assert.equal(vagas.length, 1)

  const vaga = vagas[0]

  assert.equal(vaga.externalId, "123456")

  assert.equal(vaga.title, "Analista de Suporte")

  assert.equal(vaga.company, "Empresa Brasileira")

  assert.equal(vaga.remote, true)

  assert.equal(vaga.location, "Brasil")

  assert.equal(vaga.publishedAt, "2026-08-23T15:00:00.000Z")
})

test("Vagas.com preserva cidade e UF quando a vaga não é remota", () => {
  const html = `
      <ul>
        <li class="vaga">
          <h2 class="cargo">
            <a
              class="link-detalhes-vaga"
              data-id-vaga="654321"
              title="Analista de Sistemas"
              href="/vagas/v654321/analista-de-sistemas"
            >
              Analista de Sistemas
            </a>
          </h2>

          <span class="emprVaga">
            Empresa Paraibana
          </span>

          <div class="detalhes">
            Sustentação de sistemas corporativos.
          </div>

          <div class="vaga-local">
            João Pessoa / PB
          </div>

          <span class="data-publicacao">
            26/08/2026
          </span>
        </li>
      </ul>
    `

  const vagas = parseVagasComHtml(html, AGORA)

  assert.equal(vagas.length, 1)

  assert.equal(vagas[0].remote, false)

  assert.equal(vagas[0].location, "João Pessoa, PB, Brasil")

  assert.equal(vagas[0].publishedAt, "2026-08-26T12:00:00.000Z")
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
