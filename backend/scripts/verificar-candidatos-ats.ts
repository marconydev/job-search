import fs from "node:fs"

type Ats = "greenhouse" | "lever" | "workable" | "ashby" | "recruitee" | "inhire"

type Candidato = { provedor: Ats; slug: string; variante: string }

const CANDIDATOS: Candidato[] = [
  { provedor: "workable", slug: "itau-unibanco", variante: "padrao" },
  { provedor: "inhire", slug: "bradesco", variante: "padrao" },
  { provedor: "workable", slug: "banco-safra", variante: "padrao" },
  { provedor: "inhire", slug: "sicredi", variante: "padrao" },
  { provedor: "greenhouse", slug: "btgpactual", variante: "padrao" },
  { provedor: "inhire", slug: "xp", variante: "padrao" },
  { provedor: "workable", slug: "nubank", variante: "padrao" },
  { provedor: "ashby", slug: "neon", variante: "padrao" },
  { provedor: "workable", slug: "mercado-livre", variante: "padrao" },
  { provedor: "workable", slug: "mercadolibre", variante: "padrao" },
  { provedor: "workable", slug: "mercadopago", variante: "padrao" },
  { provedor: "greenhouse", slug: "inter", variante: "padrao" },
  { provedor: "greenhouse", slug: "stone", variante: "padrao" },
  { provedor: "workable", slug: "stone-pagamentos", variante: "padrao" },
  { provedor: "greenhouse", slug: "c6bank", variante: "padrao" },
  { provedor: "inhire", slug: "cielo", variante: "padrao" },
  { provedor: "recruitee", slug: "accenture", variante: "padrao" },
  { provedor: "workable", slug: "senior-sistemas", variante: "padrao" },
  { provedor: "recruitee", slug: "matera", variante: "padrao" },
  { provedor: "workable", slug: "serasa-experian", variante: "padrao" },
  { provedor: "recruitee", slug: "dock", variante: "padrao" }
]

async function verificar(c: Candidato): Promise<{
  ok: boolean
  total: number
  amostra: string[]
  erro: string | null
}> {
  try {
    let url = ""
    const headers: Record<string, string> = { Accept: "application/json" }

    if (c.provedor === "greenhouse") {
      url = `https://boards-api.greenhouse.io/v1/boards/${c.slug}/jobs?content=false`
    } else if (c.provedor === "lever") {
      url = `https://api.lever.co/v0/postings/${c.slug}?mode=json`
    } else if (c.provedor === "ashby") {
      url = `https://api.ashbyhq.com/posting-api/job-board/${c.slug}`
    } else if (c.provedor === "workable") {
      url = `https://www.workable.com/api/accounts/${c.slug}?details=true`
    } else if (c.provedor === "recruitee") {
      url = `https://${c.slug}.recruitee.com/api/offers/`
    } else {
      url = `https://api.inhire.app/job-posts/public/pages`
      headers["X-Inhire-Client"] = "web-inhire"
      headers["X-Tenant"] = c.slug
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000)
    })

    if (!res.ok) return { ok: false, total: 0, amostra: [], erro: `HTTP ${res.status}` }

    const tipo = res.headers.get("content-type") ?? ""
    if (!tipo.includes("json")) return { ok: false, total: 0, amostra: [], erro: `content-type=${tipo}` }

    let dados: unknown
    try {
      dados = await res.json()
    } catch {
      return { ok: false, total: 0, amostra: [], erro: "json invalido" }
    }

    // Normaliza lista de vagas por provedor
    let lista: Array<Record<string, unknown>> = []
    if (Array.isArray(dados)) lista = dados as Array<Record<string, unknown>>
    else if (dados && typeof dados === "object") {
      const obj = dados as Record<string, unknown>
      if (Array.isArray(obj.jobs)) lista = obj.jobs as Array<Record<string, unknown>>
      else if (Array.isArray(obj.offers)) lista = obj.offers as Array<Record<string, unknown>>
      else if (Array.isArray(obj.jobsPage)) lista = obj.jobsPage as Array<Record<string, unknown>>
    }

    // Filtra vagas com título real (evita objeto vazio)
    const comTitulo = lista.filter(j => {
      const t = j.title ?? j.text ?? j.position ?? j.displayName
      return typeof t === "string" && t.trim().length > 0
    })

    const amostra = comTitulo
      .slice(0, 3)
      .map(j => {
        const t = (j.title ?? j.text ?? j.position ?? j.displayName) as string
        return String(t).slice(0, 60)
      })

    return {
      ok: comTitulo.length > 0,
      total: comTitulo.length,
      amostra,
      erro: comTitulo.length === 0 ? "0 vagas com titulo" : null
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro"
    return { ok: false, total: 0, amostra: [], erro: msg.slice(0, 80) }
  }
}

async function main() {
  const validos: Candidato[] = []
  const invalidos: Array<{ c: Candidato; r: Awaited<ReturnType<typeof verificar>> }> = []

  for (const c of CANDIDATOS) {
    const r = await verificar(c)
    const id = `${c.provedor}:${c.slug}`
    if (r.ok) {
      console.log(`✓ ${id.padEnd(35)} ${r.total} vaga(s)`)
      for (const t of r.amostra) console.log(`     - ${t}`)
      validos.push(c)
    } else {
      console.log(`✗ ${id.padEnd(35)} ${r.erro}`)
      invalidos.push({ c, r })
    }
  }

  console.log("")
  console.log(`Válidos: ${validos.length}/${CANDIDATOS.length}`)
  console.log(`Invalidos: ${invalidos.length}/${CANDIDATOS.length}`)

  fs.writeFileSync("scripts/.backups/candidatos-ats-verificados.json", JSON.stringify({ validos, invalidos: invalidos.map(i => i.c) }, null, 2))
  console.log("Salvo em: scripts/.backups/candidatos-ats-verificados.json")
}

main().catch(e => { console.error(e); process.exit(1) })
