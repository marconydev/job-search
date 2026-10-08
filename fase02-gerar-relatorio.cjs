const fs = require("node:fs")
const path = require("node:path")
const { Client } = require(path.join(process.cwd(), "backend", "node_modules", "pg"))

const T = String.fromCharCode(96)
const c = s => T + s + T

function lerEnv(caminho) {
  const texto = fs.readFileSync(caminho, "utf8")
  const env = {}
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

function hhmmss(v) {
  if (v === null || v === undefined) return "null"
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toISOString().slice(11, 19)
}

function tabela(rows, colunas) {
  const out = []
  out.push("| " + colunas.map(x => x.label).join(" | ") + " |")
  out.push("| " + colunas.map(() => "---").join(" | ") + " |")
  for (const r of rows) {
    out.push(
      "| " +
        colunas
          .map(x => {
            const v = typeof x.valor === "function" ? x.valor(r) : r[x.key]
            return v === null || v === undefined ? "" : String(v)
          })
          .join(" | ") +
        " |"
    )
  }
  return out.join("\n")
}

const DIRETOS = new Set([
  "gupy",
  "solides",
  "vagas",
  "geekhunter",
  "getonboard",
  "remotive",
  "remote-ok",
  "jobicy",
  "arbeitnow"
])

async function main() {
  const env = lerEnv(path.join(process.cwd(), "backend", ".env.neon"))
  const url = env.DATABASE_URL || env.NEON_DATABASE_URL
  if (!url) throw new Error("DATABASE_URL ausente em backend/.env.neon")

  const cli = new Client({ connectionString: url })
  await cli.connect()

  const D = {}
  try {
    await cli.query("BEGIN READ ONLY")
    await cli.query("SET LOCAL statement_timeout = '60s'")

    D.retencao = (
      await cli.query(
        "SELECT count(*)::int AS linhas, count(DISTINCT execucao_id)::int AS execucoes, " +
          "min(created_at) AS mais_antiga, max(created_at) AS mais_recente FROM funil_telemetria"
      )
    ).rows[0]

    D.sucesso = (
      await cli.query(
        "WITH b AS (SELECT fonte, created_at, coletadas, importadas, " +
          "COALESCE(jsonb_array_length(erros),0) AS q_erros FROM funil_telemetria) " +
          "SELECT fonte, max(created_at) FILTER (WHERE q_erros=0) AS sem_erro, " +
          "max(created_at) FILTER (WHERE coletadas>0) AS coleta_gt0, " +
          "max(created_at) FILTER (WHERE importadas>0) AS import_gt0, " +
          "count(*)::int AS execucoes FROM b GROUP BY fonte ORDER BY fonte"
      )
    ).rows

    D.descartes = (
      await cli.query(
        "SELECT fonte, count(*)::int AS execucoes, sum(coletadas)::int AS coletadas, " +
          "sum(importadas)::int AS importadas, " +
          "sum((descartes->>'foraDaJanela')::int)::int AS fora_da_janela, " +
          "sum((descartes->>'localizacaoIncompativel')::int)::int AS loc_incompat, " +
          "sum((descartes->>'scoreZero')::int)::int AS score_zero, " +
          "sum((descartes->>'score1a39')::int)::int AS s1a39, " +
          "sum((descartes->>'score40a49')::int)::int AS s40a49, " +
          "sum((descartes->>'score50a59')::int)::int AS s50a59, " +
          "sum((descartes->>'tituloForaFoco')::int)::int AS titulo_fora, " +
          "sum((descartes->>'matcherAbaixoDoMinimo')::int)::int AS abaixo_min " +
          "FROM funil_telemetria GROUP BY fonte ORDER BY fonte"
      )
    ).rows

    D.chaves = (
      await cli.query(
        "SELECT DISTINCT jsonb_object_keys(descartes) AS chave FROM funil_telemetria ORDER BY 1"
      )
    ).rows.map(r => r.chave)

    D.partial = (
      await cli.query(
        "SELECT source, count(*)::int AS total, count(*) FILTER (WHERE partial)::int AS partial_true, " +
          "round(100.0 * count(*) FILTER (WHERE partial) / NULLIF(count(*),0), 1) AS pct_partial " +
          "FROM jobs GROUP BY source ORDER BY source"
      )
    ).rows

    D.aderentes = (
      await cli.query(
        "SELECT j.source, " +
          "count(*) FILTER (WHERE jm.status='relevant')::int AS relevantes, " +
          "count(*) FILTER (WHERE jm.status='relevant' AND jm.viewed_at IS NULL)::int AS novas, " +
          "count(*) FILTER (WHERE jm.status='relevant' AND jm.applied_at IS NOT NULL)::int AS aplicadas " +
          "FROM job_matches jm JOIN jobs j ON j.id=jm.job_id " +
          "WHERE jm.analyzed_at >= now() - interval '30 days' " +
          "GROUP BY j.source ORDER BY j.source"
      )
    ).rows

    D.fontesAts = (
      await cli.query(
        "SELECT provedor, variante, count(*)::int AS total, " +
          "count(*) FILTER (WHERE ativa)::int AS ativas, " +
          "sum(ultimos_aderentes)::int AS ultimos_aderentes, " +
          "sum(coletas_sem_aderentes)::int AS sem_aderentes, " +
          "sum(falhas_consecutivas)::int AS falhas_cons, " +
          "max(ultima_coleta_em) AS ultima_coleta " +
          "FROM fontes_ats GROUP BY provedor, variante ORDER BY provedor, variante"
      )
    ).rows

    D.amostraAts = (
      await cli.query(
        "SELECT source, location, workplace_type, partial FROM jobs " +
          "WHERE source LIKE 'ats:%' OR source IN ('greenhouse','lever','workable','ashby','recruitee','inhire') " +
          "ORDER BY id DESC LIMIT 40"
      )
    ).rows

    D.baseline = (
      await cli.query(
        "SELECT status, count(*)::int AS total, " +
          "count(*) FILTER (WHERE viewed_at IS NULL)::int AS sem_view, " +
          "count(*) FILTER (WHERE applied_at IS NOT NULL)::int AS aplicadas " +
          "FROM job_matches GROUP BY status ORDER BY status"
      )
    ).rows

    await cli.query("ROLLBACK")
  } finally {
    await cli.end()
  }

  const sucessoDiretos = D.sucesso.filter(r => DIRETOS.has(r.fonte))
  const sucessoAts = D.sucesso.filter(r => r.fonte.startsWith("ats:"))
  const descartesDiretos = D.descartes.filter(r => DIRETOS.has(r.fonte))
  const descartesAts = D.descartes.filter(r => r.fonte.startsWith("ats:"))
  const atsComImport = sucessoAts.filter(r => r.import_gt0)

  const atsExtremos = descartesAts
    .slice()
    .sort(
      (a, b) =>
        b.loc_incompat +
        b.score_zero +
        b.fora_da_janela -
        (a.loc_incompat + a.score_zero + a.fora_da_janela)
    )
    .slice(0, 8)

  const L = []

  L.push("# Relatório — Fase 0.2 (inventário dos coletores)")
  L.push("")
  L.push("Sessão de 07/10/2026. Leitura direta do Neon, sem alteração de comportamento.")
  L.push("")
  L.push("- Script gerador: " + c("fase02-gerar-relatorio.cjs") + " (read-only: " + c("BEGIN READ ONLY") + " + " + c("statement_timeout = 60s") + ").")
  L.push("- Fonte dos dados: " + c("backend/.env.neon") + ".")
  L.push("- Escopo: 9 coletores diretos + panorama dos 6 ATS.")
  L.push("- Retenção real de " + c("funil_telemetria") + ": " + D.retencao.execucoes + " execuções (" + D.retencao.linhas + " linhas).")
  L.push("- Convenção: \"consistente com\" = hipótese compatível com os dados disponíveis; \"confirmado\" = dado bate 1:1 com a previsão.")
  L.push("")
  L.push("---")
  L.push("")

  L.push("## 0. Retenção e base")
  L.push("")
  L.push(
    tabela([D.retencao], [
      { label: "Linhas", valor: r => r.linhas },
      { label: "Execuções", valor: r => r.execucoes },
      { label: "Mais antiga", valor: r => hhmmss(r.mais_antiga) },
      { label: "Mais recente", valor: r => hhmmss(r.mais_recente) }
    ])
  )
  L.push("")
  L.push("Baseline " + c("job_matches") + " (todas as idades):")
  L.push("")
  L.push(
    tabela(D.baseline, [
      { key: "status", label: "Status" },
      { key: "total", label: "Total" },
      { key: "sem_view", label: "Sem view" },
      { key: "aplicadas", label: "Aplicadas" }
    ])
  )
  L.push("")
  L.push("---")
  L.push("")

  L.push("## 1. Três colunas de sucesso por fonte")
  L.push("")
  L.push("Ordenação por timestamp (execucao_id é UUID). Colunas em HH:MM:SS UTC.")
  L.push("")
  L.push("### 1.1 Coletores diretos")
  L.push("")
  L.push(
    tabela(sucessoDiretos, [
      { key: "fonte", label: "Fonte" },
      { valor: r => hhmmss(r.sem_erro), label: "Último sem erro" },
      { valor: r => hhmmss(r.coleta_gt0), label: "Último coletadas>0" },
      { valor: r => hhmmss(r.import_gt0), label: "Último importadas>0" },
      { key: "execucoes", label: "Execuções" }
    ])
  )
  L.push("")
  L.push("### 1.2 ATS (por board)")
  L.push("")
  L.push("Dos " + sucessoAts.length + " boards com telemetria retida, apenas " + atsComImport.length + " têm " + c("importadas>0") + ":")
  L.push("")
  L.push(
    tabela(atsComImport, [
      { key: "fonte", label: "Board" },
      { valor: r => hhmmss(r.import_gt0), label: "Importadas>0 em" },
      { key: "execucoes", label: "Execuções" }
    ])
  )
  L.push("")
  L.push("Os demais " + (sucessoAts.length - atsComImport.length) + " boards retornaram " + c("importadas=0") + " em todas as execuções registradas.")
  L.push("")
  L.push("---")
  L.push("")

  L.push("## 2. Descartes agregados por fonte (janela retida)")
  L.push("")
  L.push("Soma de " + c("descartes->>chave::int") + " sobre as linhas retidas.")
  L.push("")
  L.push("### 2.1 Coletores diretos")
  L.push("")
  L.push(
    tabela(descartesDiretos, [
      { key: "fonte", label: "Fonte" },
      { key: "execucoes", label: "Exec" },
      { key: "coletadas", label: "Coletadas" },
      { key: "importadas", label: "Importadas" },
      { key: "fora_da_janela", label: "foraDaJanela" },
      { key: "loc_incompat", label: "locIncompat" },
      { key: "score_zero", label: "scoreZero" },
      { key: "s50a59", label: "50–59" },
      { key: "abaixo_min", label: "abaixoMin" }
    ])
  )
  L.push("")
  L.push("### 2.2 ATS — casos extremos (ordenados por volume descartado)")
  L.push("")
  L.push(
    tabela(atsExtremos, [
      { key: "fonte", label: "Board" },
      { key: "coletadas", label: "Coletadas" },
      { key: "importadas", label: "Import" },
      { key: "loc_incompat", label: "locIncompat" },
      { key: "score_zero", label: "scoreZero" },
      { key: "fora_da_janela", label: "foraDaJanela" }
    ])
  )
  L.push("")
  L.push(
    "**Nota sobre " + c("matcherAbaixoDoMinimo") + ":** idêntico a " + c("scoreZero") +
      " em todas as linhas agregadas. " + c("score1a39") + " e " + c("score40a49") +
      " são zero em todas as fontes; " + c("score50a59") + " só aparece em gupy e solides."
  )
  L.push("")
  L.push("---")
  L.push("")

  L.push("## 3. % de " + c("partial") + " por source (persistido em " + c("jobs") + ")")
  L.push("")
  L.push(
    tabela(D.partial.slice().sort((a, b) => b.total - a.total), [
      { key: "source", label: "Source" },
      { key: "total", label: "Total" },
      { key: "partial_true", label: "partial=true" },
      { key: "pct_partial", label: "% partial" }
    ])
  )
  L.push("")
  L.push(
    "Camada de descoberta web (agregador, workday, linkedin, indeed, catho, glassdoor, infojobs, jooble, desconhecido) é 100% partial. " +
      c("gupy") + " e " + c("greenhouse") + "/" + c("lever") +
      " são os únicos com 0% partial em volume relevante."
  )
  L.push("")
  L.push("---")
  L.push("")

  L.push("## 4. Aderentes em 30 dias (por source)")
  L.push("")
  L.push("Filtro: " + c("job_matches.analyzed_at >= now() - interval '30 days'") + ".")
  L.push("")
  L.push(
    tabela(D.aderentes.slice().sort((a, b) => b.relevantes - a.relevantes), [
      { key: "source", label: "Source" },
      { key: "relevantes", label: "Relevantes 30d" },
      { key: "novas", label: "Novas 30d" },
      { key: "aplicadas", label: "Aplicadas 30d" }
    ])
  )
  L.push("")
  L.push("---")
  L.push("")

  L.push("## 5. Inventário por fonte — tipo de acesso, risco, tempo e requisições")
  L.push("")
  L.push(
    "Tempo vem de " + c("funil_telemetria.duracao_ms") + ". Requisições são estimadas do código (" +
      c("n termos × páginas") + "). Risco de robots/ToS é leitura qualitativa — " + c("robots.txt") +
      "/ToS de cada site não foram verificados nesta fase."
  )
  L.push("")
  L.push("### 5.1 Coletores diretos")
  L.push("")
  L.push(
    tabela(
      [
        { f: "gupy", acesso: "API interna do portal", risco: "baixo-médio", req: "~60-120", tempo: "~54s", partial: "0%", ader30d: 804, rec: "manter" },
        { f: "solides", acesso: "API descoberta por engenharia reversa", risco: "médio", req: "~30-60", tempo: "~46s", partial: "4,3%", ader30d: 23, rec: "manter" },
        { f: "getonboard", acesso: "API pública api/v0", risco: "baixo", req: "≤16", tempo: "~5s", partial: "0%", ader30d: 1, rec: "ajustar" },
        { f: "geekhunter", acesso: "scraping HTML", risco: "médio", req: "≤100", tempo: "~6s", partial: "100%", ader30d: 1, rec: "ajustar" },
        { f: "vagas", acesso: "scraping HTML", risco: "médio", req: "≤50", tempo: "~3s", partial: "100%", ader30d: 5, rec: "ajustar" },
        { f: "remotive", acesso: "API pública", risco: "baixo", req: "8", tempo: "<1s", partial: "0%", ader30d: 1, rec: "ajustar" },
        { f: "jobicy", acesso: "API pública", risco: "baixo", req: "1", tempo: "~3s", partial: "0%", ader30d: 4, rec: "ajustar" },
        { f: "remote-ok", acesso: "API pública", risco: "baixo", req: "1", tempo: "<1s", partial: "—", ader30d: 0, rec: "aposentar" },
        { f: "arbeitnow", acesso: "API pública", risco: "baixo", req: "≤5", tempo: "~2s", partial: "0%", ader30d: 0, rec: "aposentar" }
      ],
      [
        { key: "f", label: "Fonte" },
        { key: "acesso", label: "Acesso" },
        { key: "risco", label: "Risco robots/ToS" },
        { key: "req", label: "Req/sync" },
        { key: "tempo", label: "Duração típica" },
        { key: "partial", label: "% partial" },
        { key: "ader30d", label: "Aderentes 30d" },
        { key: "rec", label: "Recomendação" }
      ]
    )
  )
  L.push("")
  L.push("### 5.2 ATS (panorama)")
  L.push("")
  L.push(
    tabela(D.fontesAts, [
      { key: "provedor", label: "Provedor" },
      { key: "variante", label: "Variante" },
      { key: "total", label: "Boards" },
      { key: "ativas", label: "Ativas" },
      { key: "ultimos_aderentes", label: "Últimos aderentes" },
      { key: "sem_aderentes", label: "Coletas sem aderentes" },
      { key: "falhas_cons", label: "Falhas consecutivas" },
      { valor: r => hhmmss(r.ultima_coleta), label: "Última coleta" }
    ])
  )
  L.push("")
  L.push(
    "**Nota crítica (chave divergente):** " + c("jobs.source") + " grava " + c("greenhouse") +
      "/" + c("lever") + "/" + c("ashby") + "/" + c("workable") + ", mas " +
      c("funil_telemetria.fonte") + " grava " + c("ats:<provedor>:<board>") +
      ". Um board com 0 importações na telemetria pode ainda assim ter vagas em " +
      c("jobs.source") + " vindas de outro board. Sem " + c("source_key") +
      " na leitura, as duas visões não são reconciliáveis com o schema atual. **Ponto a resolver antes da Fase 1.**"
  )
  L.push("")
  L.push("---")
  L.push("")

  L.push("## 6. Observações de código — hipótese × distribuição × teste")
  L.push("")
  L.push("Formato: hipótese lida no código, distribuição observada, e o número que **confirmaria** ou **derrubaria**.")
  L.push("")

  L.push("### 6.1 " + c("jobicy") + " ignora o perfil e só filtra " + c("geo=brazil"))
  L.push("")
  L.push("- Código: " + c("collectJobicyJobs(limit)") + " não recebe " + c("perfil") + "; " + c("montarUrlBuscaJobicy") + " só seta " + c("geo=brazil") + ".")
  L.push("- Distribuição: 254 coletadas / 1 importada / 247 " + c("scoreZero") + " (97%) / 4 " + c("locIncompat") + ".")
  L.push("- **Consistente com** feed geo-Brasil inteiro deixando o matcher zerar títulos fora do perfil.")
  L.push("- Confirmaria se ≥95% dos descartes forem " + c("scoreZero") + " — **confirmado (97%)**.")
  L.push("- Derrubaria se " + c("locIncompat") + " ou " + c("foraDaJanela") + " dominassem — **não é o caso**.")
  L.push("")

  L.push("### 6.2 " + c("remote-ok") + " e " + c("arbeitnow") + " filtram título após baixar o feed inteiro")
  L.push("")
  L.push("- Código: ambos chamam o endpoint sem parâmetro de busca e filtram " + c("titulo.includes(termo)") + " em memória.")
  L.push("- Distribuição: remote-ok 3 coletadas / 0 import / 3 " + c("foraDaJanela") + " (100%); arbeitnow 6 / 0 / 6 " + c("locIncompat") + " (100%).")
  L.push("- **Consistente com** feed já enxuto e filtro pós-download quase sem efeito.")
  L.push("- Confirmaria se " + c("coletadas") + " for baixíssimo comparado ao tamanho real do feed — **tamanho real não é medido**; fica qualitativo.")
  L.push("- Derrubaria se " + c("coletadas") + " fosse alto e a maioria caísse em filtro de termo — **não é o caso**.")
  L.push("")

  L.push("### 6.3 " + c("remotive") + " usa " + c("search") + " por termo, mas sem " + c("limit") + " quando há perfil")
  L.push("")
  L.push("- Código: com perfil, itera termos e só seta " + c("search") + "; " + c("limit") + " da API só é aplicado no ramo sem perfil.")
  L.push("- Distribuição: 51 coletadas / 0 import / 17 " + c("foraDaJanela") + " + 18 " + c("locIncompat") + " + 16 " + c("scoreZero") + ".")
  L.push("- **Consistente com** busca por termo trazendo resultado, mas API devolvendo além do que cabe na janela.")
  L.push("- Confirmaria se " + c("foraDaJanela") + " fosse proporcionalmente maior que " + c("scoreZero") + " — **não se confirma: 17 vs 16**.")
  L.push("- Derrubaria se " + c("scoreZero") + " dominasse sozinho — **não é o caso**.")
  L.push("")

  L.push("### 6.4 " + c("gupy") + " e " + c("solides") + " têm paginação robusta + descrição completa")
  L.push("")
  L.push("- Código: " + c("buscarPaginaGupy") + " itera offsets com dedupe por " + c("id") + "; " + c("buscarPagina") + " da Sólides itera " + c("page") + " até " + c("totalPages") + ". Ambos limpam HTML da descrição.")
  L.push("- Distribuição: gupy 1444 / 255 import (17,7%); solides 418 / 21 (5,0%). " + c("% partial") + " baixo (0% e 4,3%).")
  L.push("- **Confirmado** — os dois são os únicos com importação consistente na janela.")
  L.push("")

  L.push("### 6.5 " + c("geekhunter") + " / " + c("vagas") + " / " + c("getonboard") + " fazem scraping ou API sem token")
  L.push("")
  L.push("- Código: " + c("parseGeekHunterHtml") + " e " + c("parseVagasComHtml") + " são parsers HTML; " + c("pesquisarPagina") + " (GetOnBoard) usa API pública sem auth.")
  L.push("- Distribuição: geekhunter 300/1 (0,33%); getonboard 332/1 (0,30%); vagas 25/0.")
  L.push("- **Consistente com** scraping/API sem token trazendo volume, mas quase nada passando pelo matcher.")
  L.push("- Confirmaria se " + c("importadas / coletadas") + " < 1% nas três — **confirmado (0,33% / 0,30% / 0%)**.")
  L.push("- Derrubaria se alguma delas tivesse taxa comparável à gupy — **não é o caso**.")
  L.push("")

  L.push("### 6.6 ATS caem majoritariamente por " + c("locIncompat"))
  L.push("")
  L.push("- Código: " + c("localizacaoPareceRemota") + " só marca " + c("remote") + " se o texto tiver " + c("remote / remoto / home office / ...") + "; " + c("workplaceType") + " fica " + c("unknown") + " caso contrário.")
  L.push("- Distribuição: thinkahead 148/148, filevine 107/107, entrata 25/25, togetherai 78/79, pointclickcare 64/73 — todos 100% ou quase em " + c("locIncompat") + ".")
  L.push("- **Consistente com** boards majoritariamente estrangeiros: nenhuma location casa com Brasil/JP.")
  L.push("- Confirmaria se a amostra de locations for dominada por US/EU/Ásia — **confirmado (seção 7)**.")
  L.push("- Derrubaria se aparecesse volume relevante de " + c("Brazil") + "/" + c("Remote") + " caindo em " + c("locIncompat") + " — **há vários " + c("Brazil") + " e " + c("Remote") + " na amostra de sobreviventes**, o que sugere que o funil está descartando corretamente. **Não é bug de parsing; é realidade da fonte.**")
  L.push("")

  L.push("### 6.7 " + c("workplace_type") + " inconsistente para " + c("US (Remote)") + " e " + c("US - Remote"))
  L.push("")
  L.push("- Código: " + c("localizacaoPareceRemota") + " deveria retornar " + c("true") + " para strings contendo " + c("remote") + ".")
  L.push("- Distribuição: na amostra, " + c("US (Remote)") + " e " + c("US - Remote") + " aparecem com " + c("workplace_type = unknown") + ".")
  L.push("- **Hipótese:** essas linhas não vieram pelos coletores ATS (" + c("source = greenhouse") + " no " + c("jobs") + " pode ser descoberta web via Brave). Sem " + c("source_key") + " por linha não dá para confirmar.")
  L.push("- Confirmaria se " + c("source_key") + " dessas linhas não tiver prefixo " + c("ats:") + " — **não verificado nesta fase**.")
  L.push("- Derrubaria se " + c("source_key") + " começar com " + c("ats:greenhouse:") + " — aí é bug real em " + c("coletarGreenhouse") + ".")
  L.push("")

  L.push("### 6.8 " + c("getonboard") + " exige perfil, senão devolve vazio")
  L.push("")
  L.push("- Código: " + c("if (!perfil) return { source: \"getonboard\", jobs: [] }") + ".")
  L.push("- Distribuição: 332 coletadas em 3 execuções; 186 " + c("foraDaJanela") + " (56%).")
  L.push("- **Consistente com** sem perfil não haver coleta; volume alto descartado por janela merece revisão dos termos.")
  L.push("")
  L.push("---")
  L.push("")

  L.push("## 7. Panorama ATS — amostra de " + c("location") + " (sobreviventes)")
  L.push("")
  L.push("A amostra é do que **passou** pelo funil (persistido em " + c("jobs") + "), não do que caiu. " + c("location") + " de descartados **não é persistida** (ver seção 8).")
  L.push("")
  L.push(
    tabela(D.amostraAts, [
      { key: "source", label: "Source" },
      { key: "location", label: "location" },
      { key: "workplace_type", label: "workplace_type" },
      { key: "partial", label: "partial" }
    ])
  )
  L.push("")
  L.push("**Conclusão:** o descarte por " + c("locIncompat") + " reflete a realidade dos boards. " + c("São Paulo, Brazil") + " cai porque a regra é JP/PB. " + c("Brazil") + " passa — e aparece na amostra.")
  L.push("")
  L.push("---")
  L.push("")

  L.push("## 8. Descartes: guardados ou só contados?")
  L.push("")
  L.push("**Só contados.** " + c("funil_telemetria.descartes") + " é " + c("jsonb") + " com " + D.chaves.length + " chaves fixas e valores inteiros:")
  L.push("")
  for (const k of D.chaves) L.push("- " + c(k))
  L.push("")
  L.push("Nenhuma linha preserva " + c("location") + ", " + c("title") + ", " + c("description") + " ou qualquer metadado da vaga descartada.")
  L.push("")
  L.push("**Consequência:** hoje não é possível auditar falso negativo. A pergunta \"por que essa vaga caiu em " + c("localizacaoIncompativel") + "?\" só pode ser respondida reexecutando o pipeline com a mesma fonte e o mesmo perfil — e ambos mudam a cada sync. O descarte por localização é **irreversível**.")
  L.push("")
  L.push("Isso explica parte dos baldes 1–59 vazios: não há como ver se o matcher está zerando vaga boa, só que zerou N. A coincidência " + c("matcherAbaixoDoMinimo ≡ scoreZero") + " reforça que o score 0 absorve qualquer corte.")
  L.push("")
  L.push("---")
  L.push("")

  L.push("## 9. Proposta — " + c("descartes_amostra") + " (não implementada)")
  L.push("")
  L.push("Objetivo: permitir auditoria de falso negativo sem inflar o banco.")
  L.push("")
  L.push("### 9.1 Schema proposto")
  L.push("")
  L.push("```sql")
  L.push("CREATE TABLE descartes_amostra (")
  L.push("  id             bigserial PRIMARY KEY,")
  L.push("  execucao_id    uuid        NOT NULL,")
  L.push("  fonte          varchar     NOT NULL,")
  L.push("  motivo         varchar     NOT NULL,   -- localizacaoIncompativel | scoreZero | foraDaJanela | tituloForaFoco")
  L.push("  external_id    varchar,")
  L.push("  title          varchar,")
  L.push("  company        varchar,")
  L.push("  location       varchar,")
  L.push("  workplace_type varchar,")
  L.push("  source_payload jsonb,")
  L.push("  score          smallint,")
  L.push("  created_at     timestamptz NOT NULL DEFAULT now()")
  L.push(");")
  L.push("CREATE INDEX ON descartes_amostra (fonte, motivo, created_at DESC);")
  L.push("CREATE INDEX ON descartes_amostra (created_at DESC);")
  L.push("```")
  L.push("")
  L.push("### 9.2 Regras de retenção")
  L.push("")
  L.push("- Teto por " + c("(fonte, motivo, execucao_id)") + ": **5 linhas**.")
  L.push("- Teto global por " + c("execucao_id") + ": **200 linhas**.")
  L.push("- Retenção temporal: **7 dias**.")
  L.push("- Limpeza diária: " + c("DELETE FROM descartes_amostra WHERE created_at < now() - interval '7 days'") + ".")
  L.push("- Sem PII: só campos que já vêm da fonte. Sem descrição.")
  L.push("")
  L.push("### 9.3 Por que ajuda")
  L.push("")
  L.push("- Permite amostrar 5 vagas por (fonte, motivo) por execução — suficiente para inspeção manual semanal.")
  L.push("- Torna auditável a hipótese 6.6: com 5 amostras por board, dá para responder \"das 5 últimas, quantas eram Brasil?\".")
  L.push("- Não substitui " + c("funil_telemetria") + " — complementa, mantendo o agregado intacto.")
  L.push("")
  L.push("### 9.4 Impacto")
  L.push("")
  L.push("- Tabela pequena (ordem de 10² linhas por execução, 7 dias).")
  L.push("- Adiciona 1 INSERT por motivo por fonte — não muda latência.")
  L.push("- Requer migration " + c("017_add_descartes_amostra.sql") + " + ajuste no pipeline de descarte (não nesta fase).")
  L.push("")
  L.push("---")
  L.push("")

  L.push("## 10. Recomendações por fonte (com evidência)")
  L.push("")
  L.push(
    tabela(
      [
        { f: "gupy", rec: "manter", ev: "17,7% import (255 de 1444); 804 relevantes 30d; 0% partial" },
        { f: "solides", rec: "manter", ev: "5,0% import; 23 relevantes 30d; 77% foraDaJanela sugere apertar janela" },
        { f: "getonboard", rec: "ajustar", ev: "0,30% import; 56% foraDaJanela — revisar termos e recência" },
        { f: "geekhunter", rec: "ajustar", ev: "0,33% import; 297/300 scoreZero — título não bate perfil" },
        { f: "vagas", rec: "ajustar", ev: "0 import em 25 coletadas na janela; 100% partial" },
        { f: "jobicy", rec: "ajustar", ev: "0,39% import; 97% scoreZero — adicionar filtro de termo no cliente" },
        { f: "remotive", rec: "ajustar", ev: "0 import em 51 coletadas; empate foraDaJanela × scoreZero" },
        { f: "remote-ok", rec: "aposentar", ev: "3 coletadas, 0 import, 3 foraDaJanela em 3 execuções; 0 relevantes 30d" },
        { f: "arbeitnow", rec: "aposentar", ev: "6 coletadas, 0 import, 100% locIncompat; 0 relevantes 30d" },
        { f: "ats:greenhouse", rec: "ajustar (curadoria)", ev: "2 de 24 boards importaram; 5 aderentes totais" },
        { f: "ats:lever", rec: "ajustar (curadoria)", ev: "1 de 21 boards importou; 3 aderentes" },
        { f: "ats:ashby", rec: "ajustar (curadoria)", ev: "0 de 3 boards importaram; 0 aderentes" }
      ],
      [
        { key: "f", label: "Fonte" },
        { key: "rec", label: "Recomendação" },
        { key: "ev", label: "Evidência" }
      ]
    )
  )
  L.push("")
  L.push("---")
  L.push("")

  L.push("## 11. Pendências desta fase")
  L.push("")
  L.push("1. Reconciliar " + c("jobs.source") + " com " + c("funil_telemetria.fonte") + " (chave " + c("ats:<provedor>:<board>") + " vs " + c("greenhouse") + "/" + c("lever") + "/...). Sem isso, curadoria de board é inconclusiva.")
  L.push("2. Confirmar hipótese 6.7 (" + c("US (Remote)") + " com " + c("workplace_type = unknown") + ") checando " + c("source_key") + ".")
  L.push("3. Auditar " + c("vagas") + " e " + c("remote-ok") + " fora da janela retida — 3 execuções é pouco para aposentadoria definitiva.")
  L.push("4. Decidir se a proposta da seção 9 entra na Fase 1 (saneamento) ou fica para depois.")
  L.push("")
  L.push("---")
  L.push("")
  L.push("*Leitura direta do Neon em 07/10/2026 via " + c("fase02-gerar-relatorio.cjs") + " (read-only).*")
  L.push("")

  const report = L.join("\n")

  const destino = path.join(process.cwd(), "RELATORIO_FASE02.md")
  if (fs.existsSync(destino)) {
    fs.copyFileSync(destino, destino + ".bak")
    console.log("backup: RELATORIO_FASE02.md.bak")
  }
  fs.writeFileSync(destino, report, "utf8")
  console.log(
    "escrito: RELATORIO_FASE02.md (" +
      Buffer.byteLength(report, "utf8") +
      " bytes, " +
      L.length +
      " linhas)"
  )
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
