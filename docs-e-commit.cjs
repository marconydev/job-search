const fs = require("node:fs")
const path = require("node:path")

const raiz = process.cwd()

/* ------------------------------------------------------------------ */
/* 1. CHANGELOG.md — insere bloco novo após o título                   */
/* ------------------------------------------------------------------ */
const changelogAdendo = `
## [2026-10-08 — Trava geográfica v3 + saneamento] — diretiva v2

### Added

- \`RELATORIO_FASE02.md\` — inventário dos 9 coletores + panorama dos 6 ATS, com três colunas de sucesso por fonte, breakdown de descartes por chave e amostra de sobreviventes.
- \`fase02-gerar-relatorio.cjs\` — gerador read-only do relatório anterior.
- \`backend/scripts/saneamento-dryrun.ts\` e \`backend/scripts/saneamento-apply.ts\` — reprocessam a base sob a trava nova. Dry-run por padrão, apply com \`APPLY=1\`, backup JSONB dos IDs em \`backend/scripts/.backups/\`.
- \`backend/scripts/saneamento-reverter.cjs\` — reverte o apply a partir do backup.
- \`backend/tests/trava-geografica.test.ts\` — matriz de 4 pontos da diretiva + cenários mínimos (ajuste 6) + Opção 2 (bandeira estrangeira vence \`localizacoesAceitas\`).
- Teste \`fail-fast: vaga geo-bloqueada retorna score 0 sem chegar ao matcher\` em \`job-matcher.test.ts\`.
- Contador \`localizacaoInferida\` no diagnóstico do funil.

### Changed

- \`elegibilidade-localizacao.ts\` — reescrito com a matriz estrita:
  - Regra 1 (presencial): só RMPJP (João Pessoa + região metropolitana oficial). Removidos \`paraiba\` e \`pb\` sozinhos para que Campina Grande e Patos sejam bloqueados.
  - Regra 2 (híbrido): qualquer ponto do Brasil.
  - Regra 3 (remoto): só com menção explícita ao Brasil. \`Worldwide\`, \`Global\`, \`LATAM\`, \`EMEA\`, \`Anywhere\` deixam de ser passe livre.
  - Regra 4 (unknown): fallback conservador.
  - Opção 2: bandeira estrangeira vence \`localizacoesAceitas\` — um perfil com \`"global"\` não libera mais \`"Serbia | Global"\`.
  - Heurística \`cidade brasileira específica → on-site\` corrigida: UF brasileira marca localização física mesmo quando a cidade é também o nome do estado.
- \`modalidade-vaga.ts\` — \`interpretarModalidadeEstruturada\` cobre \`remote_local\` e \`remote_global\` (emitidos por GetOnBoard).
- \`collectors/ats.ts\` — os 5 coletores com campo estruturado (Lever, Workable, Ashby, Recruitee, InHire) passam a usar \`interpretarModalidadeEstruturada\`. Antes, \`hybrid\` e \`on-site\` colapsavam em \`unknown\`.
- \`filtragem-vagas.ts\` — diagnóstico separa \`localizacaoIncompativel\` de \`localizacaoInferida\`.
- \`job-matcher.ts\` — fail-fast confirmado: score 0 antes de qualquer pontuação em vaga geo-bloqueada.

### Aplicado

- Saneamento no Neon: **227 registros** passaram de \`relevant\` para \`discarded\` (968 → 741 relevant+new).
  - \`gupy\` 214 (27,0%), \`jobicy\` 3 (75,0%), \`agregador\` 2, \`greenhouse\` 2, \`desconhecido\` 2, \`indeed\` 1, \`lever\` 1, \`infojobs\` 1, \`remotive\` 1.
  - Backup de IDs: \`backend/scripts/.backups/saneamento-2026-10-08T13-40-48.json\` (reversível via \`saneamento-reverter.cjs\`).
  - Vagas vistas (\`viewed_at IS NOT NULL\`) e aplicadas **não** foram tocadas.

### Notes

- 251/251 testes backend verdes, \`tsc\` limpo, build limpo (era 230 antes).
- Docs \`HANDOFF.md\` e \`README_ATUAL.md\` atualizados.
- \`PLANO_EXPANSAO.md\` criado (LinkedIn via Brave dork, sites próprios piloto 30–50 empresas, sem LLM no pipeline, sem burlar bloqueio).
`

{
  const abs = path.join(raiz, "CHANGELOG.md")
  const linhas = fs.readFileSync(abs, "utf8").split(/\r?\n/)
  let idx = 0
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].trim() === "# Changelog") { idx = i + 1; break }
  }
  const novo = linhas.slice(0, idx).join("\n") + "\n" + changelogAdendo + "\n" + linhas.slice(idx).join("\n")
  fs.writeFileSync(abs, novo, "utf8")
  console.log("ok: CHANGELOG.md atualizado")
}

/* ------------------------------------------------------------------ */
/* 2. PLANO_EXPANSAO.md                                                */
/* ------------------------------------------------------------------ */
fs.writeFileSync(
  path.join(raiz, "PLANO_EXPANSAO.md"),
  `# PLANO_EXPANSAO — LinkedIn, Brave dorks e sites próprios

Sessão de 08/10/2026. Documento de arquitetura e diretrizes — sem implementação de código nesta fase.

## 1. Princípios não negociáveis

- **Sem LLM no pipeline de sincronização.** Matching continua determinístico e local.
- **Sem burlar bloqueio.** LinkedIn não recebe login, cookies, Playwright, Puppeteer nem requisições autenticadas. Só o que é público.
- **Brave é orçamento controlado.** Cada query conta. Cache em PostgreSQL (TTL 7 dias) já obrigatório.
- **PostgreSQL é a única fonte de estado.**
- **Nenhuma integração nova sem necessidade validada** (PROTOCOLO §7).

## 2. Frente LinkedIn — só descoberta indireta

LinkedIn tem ToS restritivo e bloqueio agressivo a automação. Duas rotas viáveis, uma descartada:

| Rota | Decisão | Motivo |
|---|---|---|
| API oficial de Jobs (\`/v2/jobPostings\`) | ❌ | Requer parceria comercial aprovada. Não se aplica. |
| Scraping autenticado (Playwright/Puppeteer com login) | ❌ | Viola ToS. Risco de banimento da conta pessoal. |
| **Brave Search com dork** (\`site:linkedin.com/jobs/view\`) | ✅ | Usa só a API pública da Brave. Nunca toca o LinkedIn diretamente. |

**Fluxo aprovado:** Brave retorna URLs do LinkedIn → \`page-inspector.ts\` já extrai dados da página pública → \`triagem-vagas-web.ts\` filtra → pipeline normal.

## 3. Brave Search — queries ancoradas no perfil

Query base construída por família:

\`\`\`
site:linkedin.com/jobs/view
  ("Analista de Suporte" OR "Analista de Sistemas" OR "Application Support")
  ("Brasil" OR "Brazil" OR "remoto" OR "remote")
  -"estágio" -"aprendiz" -"C-level"
\`\`\`

Regras derivadas do perfil (\`cargosPrincipais\` + \`cargosRelacionados\`, **nunca** \`cargosDesvio\`):

- Máximo \`LIMITE_RELACIONADOS_POR_FAMILIA_GUPY\` termos por query.
- Excluir sempre: estágio, aprendiz, C-level executivo (já em \`titulosExcluidos\`).
- Contexto geográfico fixo em \`Brasil\`.
- Sem cargos em inglês quando a fonte for portal brasileiro (regra já vigente em \`search-queries.ts\`).
- Orçamento diário controlado por \`controle_busca_web\`.

Sites alvo prioritários (Brave dork): \`linkedin.com/jobs/view\`, \`glassdoor.com.br\`, \`indeed.com.br\`.

## 4. Frente sites próprios — piloto 30–50 empresas

Objetivo: substituir descoberta web difusa por **coleta direta de boards conhecidos**, com ATS mapeado.

### 4.1 Metodologia

1. Lista curada de 30 empresas com carreiras públicas, sediadas no Brasil ou com vagas remotas Brasil, atuando em áreas compatíveis com o perfil (TI/suporte/infra).
2. Para cada empresa, identificar o ATS (Greenhouse, Lever, Workable, Ashby, Recruitee, InHire).
3. Inserir em \`fontes_ats\` (provedor + identificador + variante).
4. Rodar 2 semanas.
5. Métrica: \`importadas / coletadas > 5%\` por board. Boards abaixo disso viram \`falhas_consecutivas\` e caem via \`coletas_sem_aderentes\`.

### 4.2 Priorização dinâmica (já implementada)

- \`fontes-ats.ts\` já prioriza boards por produtividade.
- Boards sem aderência caem naturalmente da fila.
- Sem intervenção manual recorrente.

### 4.3 Métricas de sucesso do piloto

| Métrica | Meta |
|---|---|
| Vagas aderentes novas por semana | ≥ 10 |
| Taxa de importação média | ≥ 5% |
| Boards com 0 aderentes após 2 semanas | ≤ 30% |
| Custo | R$ 0 (APIs públicas) |

## 5. Cronograma sugerido

| Semana | Frente |
|---|---|
| 1–2 | Curadoria manual: lista de 30 empresas + identificação de ATS |
| 3–4 | Inserção em \`fontes_ats\` + rodada piloto |
| 5 | Análise: quantos boards passam da meta de 5% |
| 6 | Expansão para 50 empresas se piloto produtivo |
| 7+ | Refinamento das queries Brave com base nos títulos encontrados |

## 6. Custos

| Recurso | Custo |
|---|---|
| Brave Search API | plano atual do usuário (verificar quota mensal) |
| Coleta ATS | R$ 0 |
| LLM | R$ 0 (não usado no pipeline) |
| Infra | já provisionada (Render + Neon) |

## 7. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Banimento do LinkedIn | Nunca autenticar; usar só Brave dork |
| Estouro de quota Brave | Cache TTL 7d + \`controle_busca_web\` |
| Board ATS morto | \`falhas_consecutivas\` + \`coletas_sem_aderentes\` |
| Falso positivo nas queries | Revisão manual semanal do relatório de funil |
| Perfil editado e queries obsoletas | Regeneração automática a partir do perfil |

## 8. Não vamos fazer

- Login no LinkedIn.
- Playwright / Puppeteer / Selenium no LinkedIn.
- LLM no pipeline de sincronização.
- Scraping de sites cujo \`robots.txt\` bloqueia a rota.
- Candidatura automática.
- Dependência nova sem autorização explícita.

---

*Documento criado em 08/10/2026, junto da trava geográfica v3.*
`,
  "utf8"
)
console.log("ok: PLANO_EXPANSAO.md escrito")

/* ------------------------------------------------------------------ */
/* 3. HANDOFF.md                                                       */
/* ------------------------------------------------------------------ */
fs.writeFileSync(
  path.join(raiz, "HANDOFF.md"),
  `# HANDOFF — Job Search

## 1. Estado atual (08/10/2026)

Branch \`main\`. Produção: Vercel (frontend) → Render \`job-search-api-xap1\` (backend) → Neon (banco).

Suíte: **251 testes verdes** no backend. typecheck + build zerados.

Estado do banco (Neon, após saneamento de hoje):
- **741 vagas** relevant + novas (\`viewed_at IS NULL\`), após descarte de 227.
- 36 aplicadas, 19 ignoradas, 191+227 = 418 descartadas.

## 2. Concluído nesta sessão

- Fase 0.2 (inventário dos coletores) — \`RELATORIO_FASE02.md\` + \`fase02-gerar-relatorio.cjs\`.
- Trava geográfica v3 (diretiva v2) — matriz estrita de 4 pontos:
  - Presencial só RMPJP.
  - Híbrido em qualquer ponto do Brasil.
  - Remoto só com menção explícita ao Brasil.
  - Fallback conservador.
- Opção 2: bandeira estrangeira vence \`localizacoesAceitas\`.
- ATS Lever/Workable/Ashby/Recruitee/InHire passam a usar \`interpretarModalidadeEstruturada\`.
- Fail-fast confirmado no pipeline (\`filtragem-vagas.ts\` + \`job-matcher.ts\`).
- Contador \`localizacaoInferida\` na telemetria.
- Saneamento aplicado: 227 vagas \`relevant\` → \`discarded\`, com backup JSONB dos IDs.
- \`PLANO_EXPANSAO.md\` criado (LinkedIn via Brave dork, sites próprios piloto).

## 3. Pendências

- Fase 2 (futura): botão "segunda opinião por IA" on-demand (fora do pipeline).
- Expansão de sites próprios (piloto 30–50 empresas) — ver \`PLANO_EXPANSAO.md\`.
- Refinamento de queries Brave com base no perfil — idem.
- Reconciliar \`jobs.source\` com \`funil_telemetria.fonte\` (chave \`ats:<provedor>:<board>\` vs \`"greenhouse"\`/\`"lever"\`/…). Sem isso, curadoria de board é inconclusiva.

## 4. Decisões

- Brave é orçamento controlado, não substituta de coleta direta.
- Matching é local, determinístico, sem LLM obrigatório.
- Candidatura é manual.
- PostgreSQL é a única fonte de estado.
- Sincronização é assíncrona (Vercel só encaminha; Render executa).
- \`localizacoesAceitas\` do perfil é soberana quando declarada explicitamente — **exceto** quando a localização da vaga contém bandeira estrangeira (Opção 2).
- Sem IA no pipeline.
- LinkedIn só via Brave dork, nunca autenticado.

## 5. Como retomar em nova conversa

**Scripts.**

Como o usuário executa no Git Bash (Windows):

- Scripts longos: \`cat > arquivo.sh <<'SCRIPT_END' ... SCRIPT_END\`, seguido de \`chmod +x\` e execução, TUDO em um único bloco. Nunca dividir em blocos separados nem pedir Ctrl+D.
- Heredocs aninhados com backticks ou \`$\` quebram o Git Bash. Prefira gerar \`.mjs\` por \`cat > arquivo.mjs <<'M_EOF' ... M_EOF\`.
- Nunca usar \`node -e\` com código complexo no Windows.
- Sempre rodar \`npm run test:typecheck\` e \`npm run test\` após alterar.

**Pedir arquivos que não foram lidos.**

- Peça 1-3 arquivos por vez. Nunca "o projeto inteiro".
- Se precisar de vários, gere um script que imprime \`===== caminho =====\` + conteúdo de cada arquivo, salvando em \`.txt\` na raiz.

**Devolver scripts.**

- Bloco único \`cat > arquivo.sh <<'SCRIPT_END' ... SCRIPT_END\`.
- Backup antes: \`[ -f "$F.bak" ] || cp "$F" "$F.bak"\`.
- \`set -uo pipefail\` (sem \`-e\`).
- Patch de arquivo via \`node <<'NODE' ... NODE\` com \`fs.readFileSync\` + \`replace\` + \`writeFileSync\`.
- Ao final, typecheck + testes.
- Se falhar, mostrar o trecho exato que não bateu.

## 6. Ambiente

- Windows + Git Bash.
- Node 24.13.1.
- Backend local usa \`localhost:5432\` (Postgres local). Para Neon, usar \`.env.neon\` (URL de conexão do Neon, não vai para o Git).

## 7. Endpoints externos atuais

- Gupy: \`https://portal.gupy.io/api/job-search/jobs?jobName=X&limit=100&offset=N\`
- Sólides: \`https://apigw.solides.com.br/jobs/v3/portal-vacancies?title=X&page=N\`
- Vagas.com, GeekHunter, GetOnBoard: scraping próprio.
- Remotive, Remote OK, Jobicy, Arbeitnow: feeds próprios.
- ATS: Greenhouse, Lever, Workable, Ashby, Recruitee, InHire.

## 8. Pontos a evitar

- Integração sem necessidade validada.
- Duplicar fonte que já tem coletor direto.
- Brave para o que um portal público faz melhor.
- Regra de localização dentro de coletor.
- Matching diretamente em rotas.
- Automatizar candidatura.
- Commitar segredos.
- LLM no pipeline de sincronização.
- LinkedIn autenticado / Playwright no LinkedIn.

## 9. BLOCO DE RETOMADA

Copie o texto entre as linhas abaixo para iniciar a próxima conversa.

---

Estou continuando o desenvolvimento do projeto Job Search (C:\\Projetos\\job-search).

Stack: Node.js, TypeScript, Express 5, PostgreSQL (pg), Next.js 16, React 19. Deploy: Vercel (frontend) → Render (job-search-api-xap1) → Neon.

Estado atual (08/10/2026): 251 testes verdes no backend, typecheck + build zerados. Branch main sincronizada. Banco Neon com 741 vagas relevant+new (após saneamento que descartou 227).

Concluído nesta sessão: Fase 0.2 (RELATORIO_FASE02.md + fase02-gerar-relatorio.cjs); Trava geográfica v3 (matriz estrita de 4 pontos — presencial só RMPJP, híbrido em todo Brasil, remoto só com Brasil explícito, fallback conservador); Opção 2 (bandeira estrangeira vence localizacoesAceitas); ATS Lever/Workable/Ashby/Recruitee/InHire usando interpretarModalidadeEstruturada; fail-fast confirmado; contador localizacaoInferida na telemetria; saneamento aplicado (227 → discarded, com backup JSONB reversível em backend/scripts/.backups/); PLANO_EXPANSAO.md criado.

Pendências:
- Expansão de sites próprios (piloto 30–50 empresas) — ver PLANO_EXPANSAO.md.
- Refinamento de queries Brave com base no perfil.
- Reconciliar jobs.source com funil_telemetria.fonte.
- Fase 2 (futura): botão "segunda opinião por IA" on-demand.

Regras de trabalho: sem LLM no pipeline; scripts em bloco único; backup antes de alteração; typecheck + testes + lint + build antes de considerar pronto; backend local usa Postgres local, para Neon usar .env.neon; LinkedIn só via Brave dork, nunca autenticado.

Leia HANDOFF.md, README_ATUAL.md e PROTOCOLO.md antes de qualquer coisa. Depois me diga se está pronto para continuar. Próximo passo sugerido: piloto de sites próprios (30 empresas).
`,
  "utf8"
)
console.log("ok: HANDOFF.md escrito")

/* ------------------------------------------------------------------ */
/* 4. README_ATUAL.md                                                  */
/* ------------------------------------------------------------------ */
fs.writeFileSync(
  path.join(raiz, "README_ATUAL.md"),
  `# README_ATUAL — Job Search

Snapshot do estado da aplicação após a sessão de 08/10/2026.

## Funcionalidades ativas

- 9 coletores diretos: Gupy, Sólides, Vagas.com, GeekHunter, GetOnBoard, Remotive, Remote OK, Jobicy, Arbeitnow.
- Aprendizado e coleta de 6 ATS: Greenhouse, Lever, Workable, Ashby, Recruitee, InHire — com modalidade estruturada preservada.
- Descoberta web complementar via Brave Search (opcional, orçamento controlado).
- Cache de buscas web em PostgreSQL com TTL de 7 dias.
- Trava geográfica v3: presencial só RMPJP, híbrido em todo o Brasil, remoto só com Brasil explícito.
- Matching determinístico local, score 0–100, corte 60.
- Perfil profissional singleton em JSONB.
- Importação de currículo PDF, DOCX e TXT.
- Sincronização assíncrona com trava, heartbeat e detecção de interrupção.
- Telemetria de funil por execução/fonte em \`funil_telemetria\` (com contador \`localizacaoInferida\`).
- Hash de conteúdo das vagas para evitar reanálise redundante.
- Fila de ATS prioriza boards produtivos por \`coletas_sem_aderentes\`.
- Scripts de saneamento da base (dry-run + apply + reverter).

## Sessão de outubro/2026 — o que mudou

- Fase 0.2: \`RELATORIO_FASE02.md\` (inventário dos 9 coletores + panorama ATS) e \`fase02-gerar-relatorio.cjs\`.
- Trava geográfica v3 aplicada:
  - Presencial só passa em RMPJP (João Pessoa + 20 municípios oficiais).
  - Híbrido passa em qualquer ponto do Brasil.
  - Remoto só passa com menção explícita ao Brasil.
  - Opção 2: bandeira estrangeira vence \`localizacoesAceitas\` do perfil.
- ATS Lever, Workable, Ashby, Recruitee e InHire passam a extrair modalidade via \`interpretarModalidadeEstruturada\` (antes colapsavam híbrido/presencial em \`unknown\`).
- \`localizacaoInferida\` separado de \`localizacaoIncompativel\` na telemetria.
- Fail-fast confirmado: score 0 sem cálculo para vaga geo-bloqueada.
- Saneamento: 227 vagas \`relevant\` não vistas → \`discarded\`. Backup reversível em \`backend/scripts/.backups/\`.
- \`PLANO_EXPANSAO.md\`: LinkedIn via Brave dork, sites próprios piloto 30–50 empresas, sem LLM no pipeline, sem burlar bloqueio.
- 251 testes backend verdes.

## Pendências

- Piloto de sites próprios (30–50 empresas) — ver \`PLANO_EXPANSAO.md\`.
- Refinamento de queries Brave a partir do perfil.
- Reconciliar \`jobs.source\` com \`funil_telemetria.fonte\`.
- Fase 2 (futura): botão "segunda opinião por IA" on-demand.
`,
  "utf8"
)
console.log("ok: README_ATUAL.md escrito")

console.log("")
console.log("===== docs prontos =====")
