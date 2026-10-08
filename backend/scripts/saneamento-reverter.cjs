const fs = require("node:fs")
const path = require("node:path")
const { Client } = require(path.join(process.cwd(), "node_modules", "pg"))

function lerEnv(caminho) {
  const texto = fs.readFileSync(caminho, "utf8")
  const env = {}
  for (const linha of texto.split(/\r?\n/)) {
    const t = linha.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i < 0) continue
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    env[t.slice(0, i).trim()] = v
  }
  return env
}

async function main() {
  const alvo = process.argv[2]
  if (!alvo) { console.error("uso: node saneamento-reverter.cjs <caminho-backup.json>"); process.exit(1) }
  const dados = JSON.parse(fs.readFileSync(alvo, "utf8"))
  const env = lerEnv(path.join(process.cwd(), ".env.neon"))
  const cli = new Client({ connectionString: env.DATABASE_URL || env.NEON_DATABASE_URL })
  await cli.connect()
  try {
    await cli.query("BEGIN")
    await cli.query(
      "UPDATE job_matches SET status = 'relevant', status_updated_at = NOW() WHERE id = ANY($1::bigint[])",
      [dados.match_ids]
    )
    await cli.query("COMMIT")
    console.log("Revertidos: " + dados.match_ids.length + " registros.")
  } finally { await cli.end() }
}
main().catch(e => { console.error(e); process.exit(1) })
