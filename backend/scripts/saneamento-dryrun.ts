import fs from "node:fs"
import path from "node:path"

import { Client } from "pg"

import { avaliarElegibilidadeBrasil } from "../src/services/elegibilidade-localizacao.js"

function lerEnv(caminho: string): Record<string, string> {
  const texto = fs.readFileSync(caminho, "utf8")
  const env: Record<string, string> = {}
  for (const linha of texto.split(/\r?\n/)) {
    const t = linha.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i < 0) continue
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    env[t.slice(0, i).trim()] = v
  }
  return env
}

async function main() {
  const env = lerEnv(path.join(process.cwd(), ".env.neon"))
  const url = env.DATABASE_URL || env.NEON_DATABASE_URL
  if (!url) throw new Error("DATABASE_URL ausente em .env.neon")

  const cli = new Client({ connectionString: url })
  await cli.connect()

  try {
    await cli.query("BEGIN READ ONLY")
    await cli.query("SET LOCAL statement_timeout = '60s'")

    const perfilRow = (
      await cli.query<{ dados: { localizacoesAceitas?: string[] } }>(
        "SELECT dados FROM perfil_profissional WHERE id = 1 LIMIT 1"
      )
    ).rows[0]

    const localizacoesAceitas = perfilRow?.dados?.localizacoesAceitas ?? []

    const rows = (
      await cli.query<{
        match_id: number
        job_id: number
        source: string | null
        title: string
        company: string
        location: string | null
        remote: boolean
        workplace_type: string | null
        description: string
      }>(
        "SELECT jm.id AS match_id, jm.job_id, j.source, j.title, j.company, " +
          "j.location, j.remote, j.workplace_type, j.description " +
          "FROM job_matches jm JOIN jobs j ON j.id = jm.job_id " +
          "WHERE jm.status = 'relevant' " +
          "  AND jm.viewed_at IS NULL " +
          "  AND jm.applied_at IS NULL"
      )
    ).rows

    const porSource = new Map<string, { total: number; incompat: number }>()
    const exemplos: Array<{
      match_id: number
      source: string
      title: string
      company: string
      location: string | null
      workplace_type: string | null
      remote: boolean
      motivo: string
      inferida: boolean
    }> = []

    for (const r of rows) {
      const aval = avaliarElegibilidadeBrasil(
        r.location,
        r.description,
        r.title,
        r.remote === true,
        localizacoesAceitas,
        r.workplace_type
      )

      const s = r.source ?? "desconhecido"
      if (!porSource.has(s)) porSource.set(s, { total: 0, incompat: 0 })
      const bucket = porSource.get(s)!
      bucket.total++

      if (aval.situacao === "incompativel") {
        bucket.incompat++
        exemplos.push({
          match_id: r.match_id,
          source: s,
          title: r.title,
          company: r.company,
          location: r.location,
          workplace_type: r.workplace_type,
          remote: r.remote === true,
          motivo: aval.motivo,
          inferida: aval.inferida === true
        })
      }
    }

    const total = rows.length
    const totalIncompat = exemplos.length

    console.log("")
    console.log("===== SANEAMENTO DRY-RUN =====")
    console.log("")
    console.log("Localizacoes aceitas do perfil: " + JSON.stringify(localizacoesAceitas))
    console.log("")
    console.log("Total (relevant + nao vistas + nao aplicadas): " + total)
    console.log("Virariam para discarded: " + totalIncompat)
    console.log("Permanecem: " + (total - totalIncompat))

    console.log("")
    console.log("===== BREAKDOWN POR SOURCE =====")

    const sorted = [...porSource.entries()].sort((a, b) => b[1].incompat - a[1].incompat)
    for (const [s, v] of sorted) {
      const pct = v.total > 0 ? ((v.incompat / v.total) * 100).toFixed(1) : "0.0"
      console.log(
        s.padEnd(20) +
          " total=" + String(v.total).padStart(5) +
          " vira_descarte=" + String(v.incompat).padStart(5) +
          " (" + pct + "%)"
      )
    }

    console.log("")
    console.log("===== 30 EXEMPLOS (maiores volumes primeiro) =====")

    const porVol = [...exemplos].sort((a, b) => a.source.localeCompare(b.source))
    for (const e of porVol.slice(0, 30)) {
      console.log(JSON.stringify(e))
    }

    console.log("")
    console.log("===== AMOSTRA DEDUPLICADA (primeiros 30 unicos por title+location) =====")

    const vistos = new Set<string>()
    let emitidos = 0
    for (const e of exemplos) {
      const chave = `${e.title}|${e.location}`
      if (vistos.has(chave)) continue
      vistos.add(chave)
      console.log(JSON.stringify(e))
      emitidos++
      if (emitidos >= 30) break
    }

    await cli.query("ROLLBACK")
  } finally {
    await cli.end()
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
