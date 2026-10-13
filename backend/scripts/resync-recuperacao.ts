/**
 * Resync de recuperacao: reanalisa job_matches discarded com a regra
 * geografica e o matcher atuais, e reverte para relevant os que passam.
 *
 * Baldes:
 *   A) geo OK + titulo OK + score >= MIN_SCORE_RELEVANT   -> recuperar
 *   B) geo OK + score < corte                             -> manter
 *   C) geo incompativel (fora do Brasil)                  -> manter
 *   D) titulo excluido (aprendiz/estagio/C-level)         -> manter
 *
 * Modos:
 *   (default)              dry-run
 *   APPLY=1                aplica balde A
 *   REVERT=1 BACKUP=path   reverte backup anterior
 */
import fs from "node:fs"
import path from "node:path"

import { Client } from "pg"

import { avaliarElegibilidadeBrasil } from "../src/services/elegibilidade-localizacao.js"
import { matchJob } from "../src/services/job-matcher.js"
import { MIN_SCORE_RELEVANT } from "../src/config/matcher.js"

import type { StoredJob } from "../src/types/job.js"
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

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

// Match estrito: palavra inteira. Evita "chefe" casar com "chef".
function temAlgumTituloExcluido(titulo: string): string | null {
  const ALVOS = [
    "aprendiz", "jovem aprendiz", "estagiario", "estagiaria", "estagio",
    "intern", "internship", "trainee",
    "ceo", "cto", "cfo", "coo", "cio",
    "diretor", "diretora", "vice-presidente", "vp ",
    "head of", "head de"
  ]
  const t = normalizar(titulo)
  for (const a of ALVOS) {
    const re = new RegExp(`(^|[^a-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i")
    if (re.test(t)) return a.trim()
  }
  return null
}

function criarVagaTemporaria(r: {
  source: string
  external_id: string
  company: string
  title: string
  description: string
  location: string | null
  remote: boolean
  workplace_type: string
  url: string
  published_at: Date | null
  created_at: Date
  partial: boolean
}): StoredJob {
  return {
    id: 0,
    source: r.source,
    external_id: r.external_id,
    company: r.company,
    title: r.title,
    description: r.description,
    location: r.location,
    remote: r.remote,
    workplace_type: r.workplace_type,
    url: r.url,
    published_at: r.published_at ? new Date(r.published_at).toISOString() : null,
    partial: r.partial,
    created_at: new Date(r.created_at).toISOString()
  }
}

async function main() {
  const env = lerEnv(path.join(process.cwd(), ".env.neon"))
  const url = env.DATABASE_URL || env.NEON_DATABASE_URL
  if (!url) throw new Error("DATABASE_URL ausente em .env.neon")

  const apply = process.env.APPLY === "1"
  const revert = process.env.REVERT === "1"
  const backupRevert = process.env.BACKUP
  const onlyIds = (process.env.ONLY_IDS || "")
    .split(",").map(x => x.trim()).filter(Boolean)

  const cli = new Client({ connectionString: url })
  await cli.connect()

  try {
    if (revert) {
      if (!backupRevert) throw new Error("REVERT=1 exige BACKUP=<caminho>")
      const dados = JSON.parse(fs.readFileSync(backupRevert, "utf8"))
      const ids = dados.match_ids || []
      console.log("Revertendo " + ids.length + " IDs para discarded...")
      await cli.query("BEGIN")
      await cli.query(
        "UPDATE job_matches SET status='discarded', status_updated_at=NOW() WHERE id = ANY($1::bigint[])",
        [ids]
      )
      await cli.query("COMMIT")
      console.log("Revertidos: " + ids.length)
      return
    }

    await cli.query(apply ? "BEGIN" : "BEGIN READ ONLY")

    const perfilRow = (
      await cli.query<{ dados: PerfilProfissional }>(
        "SELECT dados FROM perfil_profissional WHERE id = 1 LIMIT 1"
      )
    ).rows[0]
    if (!perfilRow) throw new Error("perfil_profissional id=1 ausente")
    const perfil = perfilRow.dados

    const bak = JSON.parse(
      fs.readFileSync("scripts/.backups/saneamento-2026-10-08T13-40-48.json", "utf8")
    )
    const idsBackup = bak.match_ids.map((x: unknown) => String(x))

    const rows = (
      await cli.query<{
        match_id: string
        job_id: string
        local_score: number
        source: string
        external_id: string
        company: string
        title: string
        description: string
        location: string | null
        remote: boolean
        workplace_type: string
        url: string
        published_at: Date | null
        created_at: Date
        partial: boolean
      }>(
        "SELECT jm.id AS match_id, jm.job_id, jm.local_score, " +
          "       j.source, j.external_id, j.company, j.title, j.description, " +
          "       j.location, j.remote, j.workplace_type, j.url, " +
          "       j.published_at, j.created_at, j.partial " +
          "FROM job_matches jm JOIN jobs j ON j.id = jm.job_id " +
          "WHERE jm.status = 'discarded' " +
          "  AND jm.viewed_at IS NULL " +
          "  AND jm.applied_at IS NULL " +
          "  AND NOT (jm.id = ANY($1::bigint[])) " +
          "ORDER BY jm.id",
        [idsBackup]
      )
    ).rows

    console.log("")
    console.log("===== RESYNC-RECUPERACAO " + (apply ? "APPLY" : "DRY-RUN") + " =====")
    console.log("Corte do matcher: MIN_SCORE_RELEVANT = " + MIN_SCORE_RELEVANT)
    console.log("Candidatos discarded (fora do backup): " + rows.length)
    console.log("")

    const baldeA: Array<{ match_id: string; title: string; location: string | null; score: number }> = []
    const baldeB: Array<{ match_id: string; title: string; location: string | null; score: number }> = []
    const baldeC: Array<{ match_id: string; title: string; location: string | null; motivo: string }> = []
    const baldeD: Array<{ match_id: string; title: string; location: string | null; token: string }> = []

    for (const r of rows) {
      // D: titulo excluido
      const token = temAlgumTituloExcluido(r.title)
      if (token) {
        baldeD.push({ match_id: r.match_id, title: r.title, location: r.location, token })
        continue
      }

      // C: geografia
      const aval = avaliarElegibilidadeBrasil(
        r.location,
        r.description,
        r.title,
        r.remote === true,
        perfil.localizacoesAceitas ?? [],
        r.workplace_type
      )
      if (aval.situacao === "incompativel") {
        baldeC.push({ match_id: r.match_id, title: r.title, location: r.location, motivo: aval.motivo })
        continue
      }

      // B / A: matcher
      const resultado = matchJob(criarVagaTemporaria(r), perfil)
      if (resultado.score < MIN_SCORE_RELEVANT) {
        baldeB.push({ match_id: r.match_id, title: r.title, location: r.location, score: resultado.score })
      } else {
        baldeA.push({ match_id: r.match_id, title: r.title, location: r.location, score: resultado.score })
      }
    }

    console.log("===== BALDES =====")
    console.log("  A) Recuperar (geo OK + titulo OK + score >= " + MIN_SCORE_RELEVANT + "): " + baldeA.length)
    console.log("  B) Score < " + MIN_SCORE_RELEVANT + "                                      : " + baldeB.length)
    console.log("  C) Geo incompativel (fora do Brasil)                   : " + baldeC.length)
    console.log("  D) Titulo excluido (aprendiz/estagio/C-level)          : " + baldeD.length)
    console.log("")

    console.log("===== BALDE A: recuperaveis =====")
    for (const e of baldeA) {
      console.log("  match_id=" + e.match_id + "  score=" + e.score + "  " + e.title + "  |  " + (e.location ?? "(null)"))
    }
    console.log("")

    console.log("===== BALDE D: excluidos por titulo =====")
    for (const e of baldeD) {
      console.log("  match_id=" + e.match_id + "  [" + e.token + "]  " + e.title)
    }
    console.log("")

    console.log("===== BALDE B: score abaixo do corte (ate 30) =====")
    for (const e of baldeB.slice(0, 30)) {
      console.log("  match_id=" + e.match_id + "  score=" + e.score + "  " + e.title + "  |  " + (e.location ?? "(null)"))
    }
    if (baldeB.length > 30) console.log("  ... +" + (baldeB.length - 30) + " mais")
    console.log("")

    console.log("===== BALDE C: geo incompativel (top 15 motivos) =====")
    const porMotivo: Record<string, number> = {}
    for (const e of baldeC) porMotivo[e.motivo] = (porMotivo[e.motivo] || 0) + 1
    for (const [m, n] of Object.entries(porMotivo).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      console.log("  " + String(n).padStart(4) + "  " + m)
    }
    console.log("")

    if (!apply) {
      await cli.query("ROLLBACK")
      console.log("DRY-RUN — nada alterado.")
      console.log("Para aplicar: APPLY=1 npx tsx scripts/resync-recuperacao.ts")
      return
    }

    if (baldeA.length === 0) {
      await cli.query("ROLLBACK")
      console.log("APPLY solicitado mas balde A vazio. Nada a fazer.")
      return
    }

    let idsRecuperar = baldeA.map(e => e.match_id)
    if (onlyIds.length > 0) {
      const set = new Set(onlyIds)
      const antes = idsRecuperar.length
      idsRecuperar = idsRecuperar.filter(x => set.has(String(x)))
      console.log("ONLY_IDS=" + JSON.stringify(onlyIds) + " filtrou balde A: " + antes + " -> " + idsRecuperar.length)
    }
    const backupDir = path.join(process.cwd(), "scripts", ".backups")
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
    const backupPath = path.join(backupDir, "resync-recuperacao-" + timestamp() + ".json")
    fs.writeFileSync(
      backupPath,
      JSON.stringify(
        {
          criado_em: new Date().toISOString(),
          total_afetado: idsRecuperar.length,
          match_ids: idsRecuperar,
          motivo: "resync-recuperacao (balde A: geo OK + titulo OK + score >= " + MIN_SCORE_RELEVANT + ")"
        },
        null,
        2
      )
    )
    console.log("Backup gravado em: " + backupPath)

    await cli.query(
      "UPDATE job_matches SET status='relevant', status_updated_at=NOW() WHERE id = ANY($1::bigint[])",
      [idsRecuperar]
    )
    await cli.query("COMMIT")
    console.log("UPDATE aplicado: " + idsRecuperar.length + " registros -> relevant")
    console.log("")
    console.log("Reverter: REVERT=1 BACKUP=" + backupPath + " npx tsx scripts/resync-recuperacao.ts")
  } catch (e) {
    try { await cli.query("ROLLBACK") } catch {}
    throw e
  } finally {
    await cli.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
