import fs from "node:fs"
import path from "node:path"

import { Client } from "pg"

function lerEnv(caminho: string): Record<string, string> {
  const texto = fs.readFileSync(caminho, "utf8")
  const env: Record<string, string> = {}
  for (const linha of texto.split(/\r?\n/)) {
    const t = linha.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i < 0) continue
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[t.slice(0, i).trim()] = v
  }
  return env
}

type Ats = "greenhouse" | "lever" | "workable" | "ashby" | "recruitee" | "inhire"

type Candidato = { provedor: Ats; identificador: string; url: string; variante: string }

const EMPRESAS: Array<{ nome: string; slugs: string[] }> = [
  { nome: "Itaú", slugs: ["itau", "itau-unibanco"] },
  { nome: "Bradesco", slugs: ["bradesco"] },
  { nome: "Safra", slugs: ["safra", "banco-safra"] },
  { nome: "Sicredi", slugs: ["sicredi"] },
  { nome: "Sicoob", slugs: ["sicoob"] },
  { nome: "BTG Pactual", slugs: ["btg-pactual", "btgpactual"] },
  { nome: "XP Inc", slugs: ["xp", "xp-inc"] },
  { nome: "Nubank", slugs: ["nubank", "nu"] },
  { nome: "Neon", slugs: ["neon", "neon-pagamentos"] },
  { nome: "Mercado Livre", slugs: ["mercadolivre", "mercado-livre", "mercadolibre"] },
  { nome: "Mercado Pago", slugs: ["mercadopago", "mercado-pago"] },
  { nome: "PicPay", slugs: ["picpay"] },
  { nome: "Inter", slugs: ["inter", "banco-inter"] },
  { nome: "PagBank", slugs: ["pagbank", "pagseguro"] },
  { nome: "Stone", slugs: ["stone", "stone-pagamentos"] },
  { nome: "C6 Bank", slugs: ["c6bank", "c6-bank"] },
  { nome: "Cielo", slugs: ["cielo"] },
  { nome: "TOTVS", slugs: ["totvs"] },
  { nome: "Accenture", slugs: ["accenture"] },
  { nome: "Senior Sistemas", slugs: ["senior", "senior-sistemas"] },
  { nome: "Softplan", slugs: ["softplan"] },
  { nome: "TIVIT", slugs: ["tivit"] },
  { nome: "Matera", slugs: ["matera"] },
  { nome: "Serasa Experian", slugs: ["serasa", "serasa-experian"] },
  { nome: "Dock", slugs: ["dock"] }
]

function urlAts(provedor: Ats, slug: string, variante: string): string {
  if (provedor === "greenhouse") return `https://boards.greenhouse.io/${slug}`
  if (provedor === "lever") {
    return variante === "eu"
      ? `https://jobs.eu.lever.co/${slug}`
      : `https://jobs.lever.co/${slug}`
  }
  if (provedor === "workable") return `https://apply.workable.com/${slug}/`
  if (provedor === "ashby") return `https://jobs.ashbyhq.com/${slug}`
  if (provedor === "recruitee") return `https://${slug}.recruitee.com`
  return `https://${slug}.inhire.app`
}

async function testar(c: Candidato): Promise<boolean> {
  try {
    const url = c.provedor === "greenhouse"
      ? `https://boards-api.greenhouse.io/v1/boards/${c.identificador}/jobs`
      : c.provedor === "lever"
      ? `${c.variante === "eu" ? "https://api.eu.lever.co" : "https://api.lever.co"}/v0/postings/${c.identificador}?mode=json`
      : c.provedor === "ashby"
      ? `https://api.ashbyhq.com/posting-api/job-board/${c.identificador}`
      : c.provedor === "workable"
      ? `https://www.workable.com/api/accounts/${c.identificador}?details=true`
      : c.provedor === "recruitee"
      ? `https://${c.identificador}.recruitee.com/api/offers/`
      : `https://api.inhire.app/job-posts/public/pages`

    const headers: Record<string, string> = { Accept: "application/json" }
    if (c.provedor === "inhire") {
      headers["X-Inhire-Client"] = "web-inhire"
      headers["X-Tenant"] = c.identificador
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000)
    })

    if (!res.ok) return false
    const text = await res.text()
    return text.length > 50 && !text.includes("not found")
  } catch {
    return false
  }
}

async function main() {
  const env = lerEnv(path.join(process.cwd(), ".env.neon"))
  const url = env.DATABASE_URL || env.NEON_DATABASE_URL
  if (!url) throw new Error("DATABASE_URL ausente")

  const apply = process.env.APPLY === "1"

  const cli = new Client({ connectionString: url })
  await cli.connect()

  try {
    await cli.query("BEGIN")

    const existentes = (
      await cli.query<{ provedor: string; identificador: string }>(
        "SELECT provedor, identificador FROM fontes_ats"
      )
    ).rows
    const chaves = new Set(existentes.map(r => `${r.provedor}:${r.identificador}`))

    const paraInserir: Candidato[] = []

    for (const emp of EMPRESAS) {
      for (const slug of emp.slugs) {
        for (const provedor of ["greenhouse", "lever", "workable", "ashby", "recruitee", "inhire"] as Ats[]) {
          const variantes = provedor === "lever" ? ["global", "eu"] : ["padrao"]
          for (const variante of variantes) {
            const chave = `${provedor}:${slug}`
            if (chaves.has(chave)) continue

            const candidato: Candidato = {
              provedor,
              identificador: slug,
              url: urlAts(provedor, slug, variante),
              variante
            }

            const ok = await testar(candidato)
            if (ok) {
              console.log(`✓ ${emp.nome.padEnd(20)} ${provedor}:${slug}${variante !== "padrao" ? ":" + variante : ""}`)
              paraInserir.push(candidato)
              break
            }
          }
          if (paraInserir.some(p => p.identificador === slug)) break
        }
      }
    }

    console.log("")
    console.log(`Total encontrados: ${paraInserir.length}`)

    if (apply && paraInserir.length > 0) {
      const backupDir = path.join(process.cwd(), "scripts", ".backups")
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const backupPath = path.join(backupDir, `fontes-ats-${stamp}.json`)
      fs.writeFileSync(backupPath, JSON.stringify({ criado_em: new Date().toISOString(), candidatos: paraInserir }, null, 2))
      console.log(`Backup: ${backupPath}`)

      for (const c of paraInserir) {
        await cli.query(
          `INSERT INTO fontes_ats (provedor, identificador, variante, url_origem, ativa, descoberta_em, ultima_vista_em)
           VALUES ($1, $2, $3, $4, true, NOW(), NOW())
           ON CONFLICT (provedor, identificador, variante) DO NOTHING`,
          [c.provedor, c.identificador, c.variante, c.url]
        )
      }
      await cli.query("COMMIT")
      console.log(`Inseridos: ${paraInserir.length}`)
    } else {
      await cli.query("ROLLBACK")
      console.log("DRY-RUN — para aplicar: APPLY=1 npx tsx scripts/descobrir-fontes-ats.ts")
    }
  } catch (e) {
    try { await cli.query("ROLLBACK") } catch {}
    throw e
  } finally {
    await cli.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
