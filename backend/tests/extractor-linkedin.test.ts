import assert from "node:assert/strict"

import { describe, test } from "node:test"

import { parseLinkedinHtml } from "../src/extractors/linkedin.js"

const HTML_JSONLD = `
<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Analista de Suporte",
  "hiringOrganization": {"@type": "Organization", "name": "Acme"},
  "description": "<p>Suporte técnico ao usuário final.</p>",
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "João Pessoa",
      "addressRegion": "PB",
      "addressCountry": "BR"
    }
  },
  "datePosted": "2026-10-01",
  "url": "https://www.linkedin.com/jobs/view/12345"
}
</script>
</head>
<body></body>
</html>
`

const HTML_TOPCARD = `
<!DOCTYPE html>
<html>
<body>
<div class="topcard">
  <h1 class="topcard__title">Analista de Sistemas</h1>
  <a class="topcard__org-name-link">Globex</a>
  <span class="topcard__flavor topcard__flavor--bullet">São Paulo, SP, Brasil</span>
</div>
<div class="description__text">
  <p>Atuação com sistemas ERP e sustentação.</p>
</div>
</body>
</html>
`

const HTML_TOPCARD_REMOTO = `
<!DOCTYPE html>
<html>
<body>
<div class="topcard">
  <h1 class="topcard__title">Analista de Suporte N2</h1>
  <a class="topcard__org-name-link">Initech</a>
  <span class="topcard__flavor topcard__flavor--bullet">Brasil (Remoto)</span>
</div>
<div class="show-more-less-html__markup">
  <p>Vaga 100% remota em território brasileiro.</p>
</div>
</body>
</html>
`

const HTML_INCOMPLETO = `
<!DOCTYPE html>
<html>
<body>
<div class="topcard">
  <h1 class="topcard__title">Analista de Suporte</h1>
</div>
</body>
</html>
`

const HTML_SEM_TITULO = `
<!DOCTYPE html>
<html>
<body>
<div class="topcard">
  <a class="topcard__org-name-link">Acme</a>
</div>
<div class="description__text"><p>Descrição.</p></div>
</body>
</html>
`

describe("extractor LinkedIn", () => {
  test("extrai vaga via JSON-LD JobPosting", () => {
    const v = parseLinkedinHtml(HTML_JSONLD, "https://www.linkedin.com/jobs/view/12345")
    assert.ok(v)
    assert.equal(v.titulo, "Analista de Suporte")
    assert.equal(v.empresa, "Acme")
    assert.equal(v.localizacao, "João Pessoa, PB, BR")
    assert.equal(v.dataPublicacao, "2026-10-01")
    assert.equal(v.remoto, false)
  })

  test("extrai vaga via topcard HTML quando não há JSON-LD", () => {
    const v = parseLinkedinHtml(HTML_TOPCARD, "https://www.linkedin.com/jobs/view/999")
    assert.ok(v)
    assert.equal(v.titulo, "Analista de Sistemas")
    assert.equal(v.empresa, "Globex")
    assert.equal(v.localizacao, "São Paulo, SP, Brasil")
    assert.match(v.descricao ?? "", /sistemas ERP/i)
    assert.equal(v.remoto, false)
  })

  test("detecta remoto quando localização menciona (Remoto)", () => {
    const v = parseLinkedinHtml(HTML_TOPCARD_REMOTO, "https://www.linkedin.com/jobs/view/777")
    assert.ok(v)
    assert.equal(v.remoto, true)
    assert.match(v.localizacao ?? "", /Remoto/i)
  })

  test("retorna null quando falta descrição", () => {
    const v = parseLinkedinHtml(HTML_INCOMPLETO, "https://www.linkedin.com/jobs/view/1")
    assert.equal(v, null)
  })

  test("retorna null quando falta título", () => {
    const v = parseLinkedinHtml(HTML_SEM_TITULO, "https://www.linkedin.com/jobs/view/2")
    assert.equal(v, null)
  })

  test("retorna null para HTML vazio", () => {
    const v = parseLinkedinHtml("", "https://www.linkedin.com/jobs/view/3")
    assert.equal(v, null)
  })

  test("não quebra com JSON-LD inválido — cai no fallback HTML", () => {
    const html = `<script type="application/ld+json">{ lixo }</script>${HTML_TOPCARD}`
    const v = parseLinkedinHtml(html, "https://www.linkedin.com/jobs/view/4")
    assert.ok(v)
    assert.equal(v.titulo, "Analista de Sistemas")
  })

  test("ignora bloco JSON-LD que não é JobPosting e cai no HTML", () => {
    const html = `
<script type="application/ld+json">
{"@type":"BreadcrumbList","itemListElement":[]}
</script>
${HTML_TOPCARD}
`
    const v = parseLinkedinHtml(html, "https://www.linkedin.com/jobs/view/5")
    assert.ok(v)
    assert.equal(v.titulo, "Analista de Sistemas")
  })

  test("usa URL recebida como urlCandidatura quando não há outra", () => {
    const v = parseLinkedinHtml(HTML_TOPCARD, "https://www.linkedin.com/jobs/view/999")
    assert.ok(v)
    assert.equal(v.urlCandidatura, "https://www.linkedin.com/jobs/view/999")
  })
})
