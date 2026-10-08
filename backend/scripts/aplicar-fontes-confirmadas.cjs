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

// Apenas os confirmados por título real na verificação
const CONFIRMADAS = [
  { provedor: "greenhouse", identificador: "stone",         variante: "padrao", url_origem: "https://boards.greenhouse.io/stone" },
  { provedor: "greenhouse", identificador: "btgpactual",     variante: "padrao", url_origem: "https://boards.greenhouse.io/btgpactual" },
  { provedor: "greenhouse", identificador: "inter",         variante: "padrao", url_origem: "https://boards.greenhouse.io/inter" },
  { provedor: "greenhouse", identificador: "c6bank",        variante: "padrao", url_origem: "https://boards.greenhouse.io/c6bank" },
  { provedor: "inhire",     identificador: "cielo",         variante: "padrao", url_origem: "https://cielo.inhire.app" },
  { provedor: "inhire",     identificador: "xp",            variante: "padrao", url_origem: "https://xp.inhire.app" },
  { provedor: "inhire",     identificador: "sicredi",       variante: "padrao", url_origem: "https://sicredi.inhire.app" }
]

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
      await cli.query("SELECT provedor, identificador, variante FROM fontes_ats")
    ).rows
    const chaves = new Set(existentes.map(r => `${r.provedor}:${r.identificador}:${r.variante}`))

    const aInserir = CONFIRMADAS.filter(
      c => !chaves.has(`${c.provedor}:${c.identificador}:${c.variante}`)
    )

    console.log("===== APLICAR FONTES CONFIRMADAS =====")
    console.log(`Modo: ${apply ? "APPLY" : "DRY-RUN"}`)
    console.log(`Candidatas: ${CONFIRMADAS.length}`)
    console.log(`Já existem: ${CONFIRMADAS.length - aInserir.length}`)
    console.log(`A inserir: ${aInserir.length}`)
    console.log("")

    for (const c of aInserir) {
      console.log(`  + ${c.provedor}:${c.identificador}  ${c.url_origem}`)
    }

    if (apply && aInserir.length > 0) {
      const backupDir = path.join(process.cwd(), "scripts", ".backups")
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const backupPath = path.join(backupDir, `fontes-ats-aplicadas-${stamp}.json`)
      fs.writeFileSync(backupPath, JSON.stringify({
        criado_em: new Date().toISOString(),
        inseridas: aInserir
      }, null, 2))
      console.log("")
      console.log(`Backup: ${backupPath}`)

      for (const c of aInserir) {
        await cli.query(
          `INSERT INTO fontes_ats (provedor, identificador, variante, url_origem, ativa, descoberta_em, ultima_vista_em)
           VALUES ($1, $2, $3, $4, true, NOW(), NOW())
           ON CONFLICT (provedor, identificador, variante) DO NOTHING`,
          [c.provedor, c.identificador, c.variante, c.url_origem]
        )
      }
      await cli.query("COMMIT")
      console.log(`Inseridas: ${aInserir.length}`)
    } else {
      await cli.query("ROLLBACK")
      console.log("")
      console.log("DRY-RUN — para aplicar: APPLY=1 node scripts/aplicar-fontes-confirmadas.cjs")
    }
  } catch (e) {
    try { await cli.query("ROLLBACK") } catch {}
    throw e
  } finally {
    await cli.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
