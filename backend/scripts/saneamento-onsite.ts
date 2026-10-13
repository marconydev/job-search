/**
 * Saneamento focado: vagas relevant com workplace_type explicitamente
 * presencial (on-site/presencial/onsite) que passariam como incompativel
 * pela funcao atual. Move para discarded.
 *
 * Modos:
 *   (default)               dry-run
 *   APPLY=1                 aplica
 *   REVERT=1 BACKUP=path    reverte
 */
import fs from "node:fs"
import path from "node:path"

import { Client } from "pg"

import { avaliarElegibilidadeBrasil } from "../src/services/elegibilidade-localizacao.js"

import type { PerfilProfissional } from "../src/types/perfil-profissional.js"

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
  const revert = process.env.REVERT === "1"
  const backupRevert = process.env.BACKUP

  const cli = new Client({ connectionString: url })
  await cli.connect()

  try {
    if (revert) {
      if (!backupRevert) throw new Error("REVERT=1 exige BACKUP=<caminho>")
      const dados = JSON.parse(fs.readFileSync(backupRevert, "utf8"))
      const ids = dados.match_ids || []
      console.log("Revertendo " + ids.length + " IDs para relevant...")
      await cli.query("BEGIN")
      await cli.query(
        "UPDATE job_matches SET status='relevant', status_updated_at=NOW() WHERE id = ANY($1::bigint[])",
        [ids]
      )
      await cli.query("COMMIT")
      console.log("Revertidos: " + ids.length)
      return
    }

    await cli.query(apply ? "BEGIN" : "BEGIN READ ONLY")

    const perfil = (
      await cli.query<{ dados: PerfilProfissional }>(
        "SELECT dados FROM perfil_profissional WHERE id = 1 LIMIT 1"
      )
    ).rows[0].dados

    const rows = (
      await cli.query<{
        match_id: string
        workplace_type: string
        title: string
        location: string | null
        description: string
        remote: boolean
      }>(
        "SELECT jm.id AS match_id, j.workplace_type, j.title, j.location, j.description, j.remote " +
          "FROM job_matches jm JOIN jobs j ON j.id = jm.job_id " +
          "WHERE jm.status = 'relevant' " +
          "  AND jm.viewed_at IS NULL " +
          "  AND jm.applied_at IS NULL " +
          "  AND j.workplace_type IN ('on-site','presencial','onsite') " +
          "ORDER BY jm.id"
      )
    ).rows

    console.log("")
    console.log("===== SANEAMENTO ON-SITE " + (apply ? "APPLY" : "DRY-RUN") + " =====")
    console.log("Candidatos (relevant + on-site/presencial): " + rows.length)
    console.log("")

    const viramDiscarded: Array<{ match_id: string; title: string; location: string | null; motivo: string }> = []
    const permanecem: Array<{ match_id: string; title: string; location: string | null; motivo: string }> = []

    for (const r of rows) {
      const aval = avaliarElegibilidadeBrasil(
        r.location, r.description, r.title, r.remote === true, perfil.localizacoesAceitas ?? [], r.workplace_type
      )
      if (aval.situacao === "incompativel") {
        viramDiscarded.push({ match_id: r.match_id, title: r.title, location: r.location, motivo: aval.motivo })
      } else {
        permanecem.push({ match_id: r.match_id, title: r.title, location: r.location, motivo: aval.motivo })
      }
    }

    console.log("===== RESUMO =====")
    console.log("  vao para discarded: " + viramDiscarded.length)
    console.log("  permanecem relevant: " + permanecem.length)
    console.log("")

    console.log("===== VAO PARA DISCARDED (" + viramDiscarded.length + ") =====")
    for (const e of viramDiscarded) {
      console.log("  match_id=" + e.match_id + "  " + e.title + "  |  " + (e.location ?? "(null)") + "  ->  " + e.motivo)
    }
    console.log("")

    console.log("===== PERMANECEM RELEVANT (" + permanecem.length + ") =====")
    for (const e of permanecem) {
      console.log("  match_id=" + e.match_id + "  " + e.title + "  |  " + (e.location ?? "(null)") + "  ->  " + e.motivo)
    }
    console.log("")

    if (!apply) {
      await cli.query("ROLLBACK")
      console.log("DRY-RUN — nada alterado.")
      console.log("Para aplicar: APPLY=1 npx tsx scripts/saneamento-onsite.ts")
      return
    }

    if (viramDiscarded.length === 0) {
      await cli.query("ROLLBACK")
      console.log("APPLY solicitado mas nada a descartar.")
      return
    }

    const ids = viramDiscarded.map(e => e.match_id)
    const backupDir = path.join(process.cwd(), "scripts", ".backups")
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
    const backupPath = path.join(backupDir, "saneamento-onsite-" + timestamp() + ".json")
    fs.writeFileSync(
      backupPath,
      JSON.stringify(
        { criado_em: new Date().toISOString(), total_afetado: ids.length, match_ids: ids, motivo: "saneamento-onsite" },
        null,
        2
      )
    )
    console.log("Backup: " + backupPath)

    await cli.query(
      "UPDATE job_matches SET status='discarded', status_updated_at=NOW() WHERE id = ANY($1::bigint[])",
      [ids]
    )
    await cli.query("COMMIT")
    console.log("APPLY: " + ids.length + " registros -> discarded")
    console.log("")
    console.log("Reverter: REVERT=1 BACKUP=" + backupPath + " npx tsx scripts/saneamento-onsite.ts")
  } catch (e) {
    try { await cli.query("ROLLBACK") } catch {}
    throw e
  } finally {
    await cli.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
