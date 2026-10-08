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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[t.slice(0, i).trim()] = v
  }
  return env
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
}

async function main() {
  const env = lerEnv(path.join(process.cwd(), ".env.neon"))
  const url = env.DATABASE_URL || env.NEON_DATABASE_URL
  if (!url) throw new Error("DATABASE_URL ausente em .env.neon")

  const apply = process.env.APPLY === "1"

  const cli = new Client({ connectionString: url })
  await cli.connect()

  try {
    await cli.query("BEGIN")

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
          "  AND jm.applied_at IS NULL " +
          "FOR UPDATE OF jm"
      )
    ).rows

    const porSource = new Map<string, { total: number; incompat: number }>()
    const idsParaDescartar: number[] = []
    const detalhes: Array<{ match_id: number; source: string; title: string; location: string | null; motivo: string; inferida: boolean }> = []

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
        idsParaDescartar.push(r.match_id)
        detalhes.push({
          match_id: r.match_id,
          source: s,
          title: r.title,
          location: r.location,
          motivo: aval.motivo,
          inferida: aval.inferida === true
        })
      }
    }

    console.log("")
    console.log("===== SANEAMENTO " + (apply ? "APPLY" : "DRY-RUN") + " =====")
    console.log("")
    console.log("Modo: " + (apply ? "APPLY (vai alterar o banco)" : "DRY-RUN (só leitura)"))
    console.log("Total relevant+nao-vistas+nao-aplicadas: " + rows.length)
    console.log("Virariam para discarded: " + idsParaDescartar.length)
    console.log("Permanecem: " + (rows.length - idsParaDescartar.length))
    console.log("")
    console.log("===== BREAKDOWN POR SOURCE =====")
    const sorted = [...porSource.entries()].sort((a, b) => b[1].incompat - a[1].incompat)
    for (const [s, v] of sorted) {
      const pct = v.total > 0 ? ((v.incompat / v.total) * 100).toFixed(1) : "0.0"
      console.log(s.padEnd(20) + " total=" + String(v.total).padStart(5) + " vira_descarte=" + String(v.incompat).padStart(5) + " (" + pct + "%)")
    }

    console.log("")
    console.log("===== 30 EXEMPLOS DEDUPLICADOS =====")
    const vistos = new Set<string>()
    let emitidos = 0
    for (const e of detalhes) {
      const chave = e.title + "|" + e.location
      if (vistos.has(chave)) continue
      vistos.add(chave)
      console.log(JSON.stringify(e))
      emitidos++
      if (emitidos >= 30) break
    }

    if (apply && idsParaDescartar.length > 0) {
      const backupDir = path.join(process.cwd(), "scripts", ".backups")
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
      const backupPath = path.join(backupDir, "saneamento-" + timestamp() + ".json")
      fs.writeFileSync(
        backupPath,
        JSON.stringify(
          {
            criado_em: new Date().toISOString(),
            total_afetado: idsParaDescartar.length,
            match_ids: idsParaDescartar
          },
          null,
          2
        )
      )
      console.log("")
      console.log("Backup de IDs gravado em: " + backupPath)

      await cli.query(
        "UPDATE job_matches SET status = 'discarded', status_updated_at = NOW() WHERE id = ANY($1::bigint[])",
        [idsParaDescartar]
      )
      await cli.query("COMMIT")
      console.log("UPDATE aplicado: " + idsParaDescartar.length + " registros passaram para discarded.")
    } else {
      await cli.query("ROLLBACK")
      console.log("")
      console.log("DRY-RUN — nada alterado. Para aplicar: APPLY=1 npx tsx scripts/saneamento-apply.ts")
    }
  } catch (e) {
    try { await cli.query("ROLLBACK") } catch {}
    throw e
  } finally {
    await cli.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
