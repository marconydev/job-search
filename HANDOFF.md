# HANDOFF — Job Search


## 0. Sessão 19/10/2026 — Sprint 1 e 2 (Tech Lead)

**Último commit:** e032f85
**Estado:** Base limpa (Sem hacks, sem Devs, sem links mortos).

### Concluído:
- **Remoção do Hack Geográfico:** `job-analysis.ts` não força mais `relevant` por Score alto.
- **Bloqueio de Desvio:** `job-matcher.ts` zera o Score para cargos na lista `cargosDesvio` do perfil.
- **Saneamento de Links:** `solides.ts` corrigiu links e o banco foi expurgado de links de listagem e subdomínios mortos.
- **Expurgo de Dados:** O banco descartou 24 vagas de Dev e 5 presenciais fora da RMPJP.

### PENDENTE (Próximos Passos - Sprint 3):
1. **Gupy Date Filter:** O coletor precisa ignorar o filtro de 21 dias se a vaga estiver com status "published" (ex: vagas antigas mas com inscrições abertas).
2. **Rotação de Termos de Busca:** Implementar um "offset" persistente no banco para que a busca (Gupy, Sólides, Brave, LinkedIn) rotacione os termos do perfil (Suporte, Infra, Sistemas) a cada sync, ao invés de sempre cortar os mesmos 20/40 termos.
3. **Mapeamento LinkedIn/Brave:** Expandir e testar as dorks para garantir cobertura das vagas manuais (InfoJobs, Glassdoor, LinkedIn).



## 0. Sessão 19/10/2026 — Sprint 1, 2 e 3 (Tech Lead)

**Último commit:** [Será preenchido no script de retomada]
**Estado:** Base limpa. Rotação implementada. Faltando validar LinkedIn/Brave e limpar fontes.

### Concluído:
- **Hack Geográfico Removido:** `job-analysis.ts` voltou a respeitar a RMPJP.
- **Bloqueio de Desvio:** `job-matcher.ts` zera Score para cargos na lista `cargosDesvio`.
- **Expurgo de Dados:** O banco descartou vagas de Dev, presenciais fora da RMPJP e links mortos.
- **Rotação de Termos:** `job-sync.ts` rotaciona os termos de busca para os coletores diretos usando offsets salvos no JSONB.
- **Cache Tolerante:** `controle-busca-web-repository.ts` não invalida mais o cache inteiro se uma consulta estiver corrompida.

### PENDENTE (Próximos Passos - Sprint 3):
1. **Validar LinkedIn/Indeed via Brave:** O cache tem 298 consultas antigas, mas precisa rodar com Brave ativado para atualizar.
2. **Validar Rotação:** Confirmar no log do Render que os offsets avançaram (de 40 para 80 na Gupy).
3. **Fontes Silenciosas:** O log mostra que as vagas de web (Brave) caem em `desconhecido` ou `agregador`. É preciso investigar se o parser do LinkedIn está extraindo localização corretamente.


## 1. Estado atual (13/10/2026)

Branch `main`. Produção: Vercel (frontend) → Render `job-search-api-xap1` (backend) → Neon (banco). Auto-Deploy = **Yes** no Render.

**Últimos commits:**
- `d679e2d` fix(collectors): bloqueia paginas de busca do Vagas.com
- `1503f01` feat(engine): auditoria tech lead - otimizacao SQL e expansao
- `373ebac` fix(web): blinda ingestao contra falsos positivos temporais
- `ee7a212` fix(engine): Opção 2 não bypassa mais a regra de presencial (RMPJP estrita)
- `e52cef3` feat(scripts): resync-recuperacao
- `a0f5224` fix(engine): corrige falso positivo em descricaoRestringeParaOutroPais
- `baa8810` fix(ats): fila com backoff temporal + classificacao de falha permanente/transitoria

**Suíte:** 295/295 testes backend verdes. typecheck + build zerados.

**Estado do banco (Neon):** ~906 vagas Gupy; ~745 relevant+new (apos saneamento de 43 presencial fora RMPJP em 13/10); ~505 vagas obsoletas ativas da Gupy; LinkedIn/Glassdoor com dados de 25/08/2026 (Brave nao autorizado desde entao).

## 2. Concluído nas sessões de 07–17/10/2026


**18/10 (pós): Expansão de Cobertura e Performance**

- `solides.ts`: paralelizado com pool de 4 workers.
- `fontes-ats.ts`: reconhece `*.gupy.io` como ATS.
- `elegibilidade-localizacao.ts`: fallback para portais nacionais (assume Brasil).
- `job-analysis.ts`: não descarta Sólides/Vagas sem `publishedAt`.
- `fonte-ats.ts`: adicionado `"gupy"` ao union type (corrige build no Render).

**[PENDENTE]** Rodar o script `verify-full-coverage.cjs` (instruções no PENDENTE.md) para homologar as 9 URLs de exemplo e provar a queda de tempo.

**18/10 (pós-LinkedIn): DOM React**
- `linkedin.ts` adaptado para React: título via `h1`/`a[href*="/jobs/view/"]`, empresa
  via `a[href*="/company/"]`, descrição via `[data-testid="expandable-text-box"]`.
- Inferência de `publishedAt` por "há X semanas/meses" (destrava o filtro de temporalidade).
- Fallback de localização por regex no body.

**18/10 (pós-Fase 1): Rastreabilidade (A3, D6, D7)**
- Migration 019 aplicada no Neon: `commit_hash`, `matcher_version`, `elegibilidade_version`, `perfil_hash`, `boot_timestamp`, `metricas`.
- `localizacaoInferida` adicionado aos `descartes`.
- `ELEGIBILIDADE_VERSION` exportada.

**18/10 (pós): ATS: paralelização + duracao_ms**
- `fontes-ats.ts` — corpo por fonte extraído em `processarFonteAts`.
- Despacho via `executarComPool(fontes, 4, fn)` (semáforo genérico). 4 workers +
  pool `pg max=5` deixam 1 conexão livre para dashboard/heartbeat.
- `duracaoMs: Math.round(performance.now() - inicioFonte)` passado em
  `registrarTelemetriaFonte`. Único ponto do backend com `duracao_ms` NULL;
  `job-sync.ts:181` já estava correto.
- Race em `falhas_consecutivas` era fantasma: `UPDATE ... = ... + 1 WHERE id = $1`
  é atômico por linha; a fila retorna IDs únicos.
- Suíte: 295/295 backend verdes. typecheck + build zerados.

**18/10: Fix PingWind — trava v3 fecha brecha em vaga remota US-federal**
- `elegibilidade-localizacao.ts` — nova função
  `descricaoIndicaRestricaoFederalEstrangeira` com 9 sinais (`public trust`,
  `security clearance`, `top secret clearance`, `u s department`,
  `us department`, `department of defense`, `department of education`,
  `federal agency`, `federal contractor`). Vaga remota com descrição que cita
  agência federal estrangeira → `incompativel`.
- Tentativa anterior (`Remote` puro → `incompativel`) revertida: quebrava
  `job-matcher.test.ts:162`.
- `backend/tests/pingwind-regression.test.ts` — 5 testes de regressão.
- Suíte: 278 → 283 testes backend verdes.

**20/10: Fix Vagas.com**
- URLs `/vagas-de-...` bloqueadas no classifier (Brave) e no coletor nativo.
- 10 vagas falsas deletadas do banco.

**19/10: Auditoria Tech Lead (Busca e SQL)**
- Brave: conversão de `page_age` (string relativa) para data ISO.
- Web Discovery: persistência reativada com validação de data estimada.
- SQL: índices parciais de performance adicionados ao Neon.
- Gupy/Brave: expansão de queries (limite de 40 termos, 8 por família).

**18/10: Blindagem Temporal (Fim dos Zumbis)**
- Coletor web (Brave) não salva mais vagas sem data de publicação confiável.
- Filtro de 21 dias operando `fail-fast` antes do INSERT.
- 231 vagas antigas/indefinidas foram deletadas permanentemente do banco (Hard Delete).

**17/10: Fix de links da Solides**
- Coletor agora gera URLs do portal central (`vagas.solides.com.br/vaga/<id>`) para IDs numéricos.
- Vagas com `isDisabled: true` são ignoradas no coletor.
- 74 URLs numéricas antigas foram atualizadas no banco. 11 alfanuméricas foram descartadas.


- Trava geográfica v3 (matriz estrita de 4 pontos) + Opção 2 (bandeira estrangeira vence `localizacoesAceitas`).
- ATS Lever/Workable/Ashby/Recruitee/InHire com modalidade estruturada preservada via `interpretarModalidadeEstruturada`.
- Fail-fast confirmado: score 0 antes de qualquer pontuação em vaga geo-bloqueada.
- Contador `localizacaoInferida` em memória (`filtragem-vagas.ts`) — **não persistido** em `funil_telemetria` (débito D6).
- Saneamento aplicado: 227 vagas `relevant` → `discarded` (backup reversível em `backend/scripts/.backups/`).
- Extractor LinkedIn (`extractors/linkedin.ts`) — JSON-LD + fallback HTML topcard. Sem login, sem Playwright.
- `conversao-vaga-web.ts` infere `workplaceType` por texto quando `remote=false`.
- 7 boards ATS adicionados: `greenhouse:stone`, `greenhouse:btgpactual`, `greenhouse:inter`, `greenhouse:c6bank`, `inhire:cielo`, `inhire:xp`, `inhire:sicredi`.
- Fila de ATS: `ORDER BY` trocado por backoff temporal (`falhas_consecutivas ASC` + `COALESCE(ultima_coleta_em, descoberta_em) + (1 + LEAST(coletas_sem_aderentes, 3)) * 30min`).
- Erro tipado `ErroColetaAts` distingue falha permanente (404/410) de transitória (timeout, 5xx, 429).
- Migration `017_add_fontes_ats_desativacao.sql` — `desativada_em`, `motivo_desativacao`, índice `(ativa, falhas_consecutivas)`.
- `backend/scripts/resync-recuperacao.ts` — reanálise cirúrgica de `job_matches` descartados. 4 baldes (A recuperar, B score baixo, C geo incompat, D título excluído). Suporta `ONLY_IDS=1,2,3` para subconjunto e `REVERT=1 BACKUP=<path>` para desfazer.
- `backend/scripts/saneamento-onsite.ts` — move para `discarded` vagas `relevant` com `workplace_type` presencial (`on-site`/`presencial`/`onsite`) que a função atual rejeita (RMPJP estrita). Suporta `REVERT=1 BACKUP=<path>`.
- `bandeirasEstrangeirasRemoto` expandida com variantes de Reino Unido (`uk`, `gb`, `great britain`, `england`, `scotland`, `wales`, `u.k.`).
- Fallback textual em `elegibilidade-localizacao.ts` quando `location=null`: usa `localizacaoTemUfBrasileira` (texto cru) + `brasil/brazil` (texto normalizado). Sem `localizacoesBrasil` para evitar falso positivo de "para" (estado Para).
- `solides.ts` — `publishedAt: null` (a API so expoe `createdAt`, data de cadastro, nao de publicacao).
- `search-queries.ts` — `gerarTermosBuscaNativaGupy` prefixa principais de todas as familias ativas antes dos cargos do perfil.
- Opção 2 (`localizacoesAceitas`) reordenada: roda após `modalidadeEfetiva`. Termos genéricos (`brasil`, `worldwide`, `global`, `latam`, etc.) não liberam `on-site`. `includes` → `contemTermo` (word boundary).

## 3. Auditoria em andamento (12/10/2026)

Auditoria read-only em curso para investigar 3 anomalias.

### 3.1 Queda `23 → 256` incompatíveis da Gupy em 2 syncs consecutivos — RESOLVIDO em 18/10

**Status:** Resolvido. Não era bug de código.
**Evidência:** O script `diag-gupy-api.cjs` rodou a API real da Gupy em 18/10 e filtrou 200 vagas.
Todas as vagas que caíram em `incompativel` tinham `workplaceType: "on-site"` e
localização em outros estados (SP, RJ, MG, DF, etc.). A Trava v3 as bloqueou corretamente.
A anomalia de 08/10 foi apenas um pico de vagas presenciais de fora no lote retornado.

*(Texto original abaixo)*

### 3.1 Queda `23 → 256` incompatíveis da Gupy em 2 syncs consecutivos [REPRIORIZADO - Fase 1]

Syncs `2dd8743c` (23:58:09Z de 08/10) e `79d97668` (00:13:04Z de 09/10), ambos rodando com a trava v3 ativa.

**Descartado:**
- **Código** — replay offline dos 3 commits (`b9bd095`, `d0e4166`, `baa8810`) sobre as mesmas 898 linhas deu resultado byte-a-byte idêntico: `incompat=257, inferida=4, compativel=612, indefinida=29, matchAderente=599`.
- **Deploy** — Auto-Deploy = Yes; trava v3 ativa nos 3 syncs.
- **Perfil** — `updated_at` anterior aos dois syncs; sem cache em `obterPerfilProfissional`.

**Em aberto:** hipótese `F1` (input da API da Gupy mudou) ou falso positivo de `descricaoRestringeParaOutroPais`.

### 3.2 Falso positivo em Curitiba — RESOLVIDO em 13/10

Causa: `descricaoRestringeParaOutroPais` aceitava indicador de restrição (`must reside in`) e bandeira estrangeira (`u.s.`, `global`, `north america`) em qualquer parte da descrição, sem exigir relação entre eles. Vagas `3514` (INSIDE SALES SUPPORT ANALYST) e `3523` (SERVICE DESK ANALYST II) tinham "U.S.-based company" na abertura corporativa + "Must reside in Curitiba, PR" nas informações adicionais. Corrigido: co-ocorrência obrigatória na mesma janela de 100 chars. Vagas existentes com `discarded` pelo motivo antigo **não são reavaliadas automaticamente**. Em 13/10, `backend/scripts/resync-recuperacao.ts` recuperou os `match_id` 6530 e 6716 (INSIDE SALES SUPPORT ANALYST e SERVICE DESK ANALYST II, ambas Curitiba/PR, hybrid, scores 69 e 100). Backup reversível: `backend/scripts/.backups/resync-recuperacao-2026-10-13T13-27-29.json`. 4 candidatos "US Weekends" (match_id 1683/1684/1686/1689) mantidos em discarded por decisão explícita.

### 3.3 E1 — estabilidade da API da Gupy [REPRIORIZADO - Fase 1]

Script `C:/Projetos/job-search-diag/e1-gupy.cjs` parcialmente executado. Fase A (3 fetches de `"analista de suporte"` espaçados 125s) + Fase B (`offset=100/200`). Payloads salvos em `C:/Projetos/job-search-diag/e1-payloads/`.

### 3.4 Opção 2 bypassava regra de presencial — RESOLVIDO em 13/10

Causa: `avaliarElegibilidadeBrasil` avaliava `localizacoesAceitas` (Opção 2) **antes** de calcular a modalidade efetiva. Com perfil `localizacoesAceitas=["brasil"]`, qualquer vaga com "Brasil" na location virava `compativel` — incluindo presencial fora da RMPJP. 43 vagas `on-site` em São Paulo, Rio, Brasília, Curitiba, Fortaleza, Florianópolis, Barueri etc. ficaram `relevant` violando a Regra 1. Bug agravado por `alvo.includes("brasil")` casar "Brasília" como substring.

Correção: `modalidadeEfetiva` roda primeiro; a Opção 2 só libera quando `modalidade !== "on-site"`. Termos genéricos em `localizacoesAceitas` não liberam presencial. `includes` → `contemTermo` (word boundary).

Aplicado: 43 registros movidos para `discarded`. Backup: `backend/scripts/.backups/saneamento-onsite-2026-10-13T16-32-28.json`.

### 3.5 Solides — `createdAt` nao e `publishedAt`

A API `apigw.solides.com.br/jobs/v3/portal-vacancies` nao expoe data de publicacao. Expoe `createdAt` (data de cadastro da vaga no sistema). O coletor usava `createdAt` como `publishedAt`, o que causava 107 de 135 vagas descartadas por `foraDaJanela` (janela = 21 dias em `JOB_LIFECYCLE.maxAgeDays`).

Correcao: `publishedAt: null`. Filtro de janela passa a ignorar Solides. Vagas existentes com `published_at` preenchido continuam com o valor antigo — nao reprocessa retroativo.

### 3.6 Falsos positivos geograficos — resolvidos em 13/10

- **`"Remote (UK)"`** (id 6078, Arbeitnow): `bandeirasEstrangeirasRemoto` nao tinha `uk`/`gb`/`england`/etc. Vaga passava como indefinida. Adicionadas as variantes.
- **`location=null` com Brasilia na descricao** (ids 6142/6145/6146, oportunidadesdf): caiam em indefinida porque `tituloTemUfBrasileira` exige separador antes da UF e `localizacaoBrasilConfirmada` so roda com `localizacao` preenchida. Novo fallback textual checa descricao crua por UF e por `brasil/brazil`.
- **`location=null` sem sinal** permanece `indefinida` — decisao consciente para nao perder vaga remota legitima.

### 3.7 Brave / LinkedIn — RESOLVIDO em 14/10

Causa raiz: `brave-search.ts:73` enviava `freshness=pm`. A API do Brave passou a responder `bad_results: true` (corpo `mixed` vazio, sem `web.results`) quando `freshness=pm` esta presente em query com `site:linkedin.com/jobs/view`, `site:br.indeed.com/viewjob` ou `site:myworkdayjobs.com`. Remover o parametro restaura a resposta (13-20 results na mesma query). A UI (search.brave.com) nao e afetada.

Descoberto em 13/10 por auditoria read-only:
- `controle_busca_web.updated_at = 13/10 18:01`, `chamadasPorDia` batendo 30/30 desde 17/08.
- Cache com 232 consultas; ultima resposta >0 de LinkedIn/Indeed em 31/08 13:42 UTC.
- `funil_telemetria` nunca teve linhas de `linkedin`/`indeed`/`glassdoor`/`brave`/`web` (debito D7).

Comprovado com 6 chamadas diretas a API Brave:
- `site:linkedin.com/jobs/view "Analista Funcional" "Brasil"` com `freshness=pm` → `bad_results: true`, 0.
- mesma query sem `freshness` → `bad_results: false`, 13 results.
- `(site:linkedin.com/jobs/view OR site:br.indeed.com/viewjob OR site:myworkdayjobs.com) ("Analista de Suporte" OR "Analista de Sistemas") "Brasil"` com `freshness=pm` → `bad_results: true`, 0.
- mesma query sem `freshness` → 20 results, `more_results_available: true`.

Frontend ja correto (2 botoes em `controle-sincronizacao.tsx`). Backend ja correto (`routes/jobs.ts:262` → `job-sync.ts:301` → `permitirBuscaLive`).

Fix aplicado em 14/10: `brave-search.ts` remove `freshness=pm`. Verificar recuperacao em 24-48h via `jobs.source = linkedin/indeed` com `created_at > 14/10`.

### 3.8 PingWind — vaga remota US-federal passou pela trava v3 — RESOLVIDO em 18/10

Vaga `Help Desk Support Agent (Mid)` da PingWind (Lever), `location="Remote"`
puro, `remote=true`, `workplace_type="remote"`, descrição cita
`U.S. Department of Education` e `Public Trust`.
`avaliarElegibilidadeBrasil` retornava `indefinida` (branch `remote` do
check `contemAlgumTermo(textoLoc, SINAIS_REMOTO)`). `filtragem-vagas.ts` e
`job-matcher.ts` tratavam `indefinida !== "incompativel"` como passagem livre,
e o +10 por remota no matcher levava o score a >= 60.

Primeira tentativa: mudar `indefinida` → `incompativel` no branch. Revertida —
quebrava `job-matcher.test.ts:162` ("mantém vaga em português quando a localização é
apenas Remote"), que representa vaga legítima em português sem sinal estrangeiro.

Fix final: nova função `descricaoIndicaRestricaoFederalEstrangeira` com 9 sinais
concretos (`public trust`, `security clearance`, `top secret clearance`,
`u s department`, `us department`, `department of defense`,
`department of education`, `federal agency`, `federal contractor`).
Roda após `descricaoRestringeParaOutroPais`; marca `incompativel` se algum sinal
aparece na descrição. Não afeta `Remote` puro sem sinal estrangeiro — recall preservado.

Teste: `backend/tests/pingwind-regression.test.ts` (5 casos).

## 4. Débitos técnicos confirmados

| ID | Débito | Evidência | Impacto |
|---|---|---|---|
| D2 | Coletores diretos nunca marcam vagas fechadas | 505 Gupy + 11 outras com `published_at > 21 dias` e `unavailable_at IS NULL` | Falso positivo permanente no painel |
| D3 | `unavailable_at` sem motivo | Schema `jobs` | Não distingue "saiu da fonte" de "rejeitada" |
| D4 | Sem registro do commit por execução | Schema `funil_telemetria`/`estado_sincronizacao` | "Qual código rodou" só por correlação temporal |
| D5 | Sem snapshot do perfil por execução | Schema | "Perfil igual entre syncs" inferido por `updated_at` |
| D6 | `localizacaoInferida` não persistido | `filtragem-vagas.ts` conta em memória | Telemetria perde o contador |
| D7 | Sem tempo/requisições por termo | Log | 15/30 termos da Gupy devolvem 0 consistentemente |
| D8 | `MATCHER_VERSION` não bumpou em `b9bd095` | Diff de 639 linhas em `elegibilidade-localizacao.ts` | Vagas com `mv=3` apesar de regra nova |

## 5. Fase 1 — desenho aprovado, não implementado

Branch com testes + migration reversível + documentação no mesmo diff. Sem merge, sem deploy.

- **A3 — Rastreabilidade por execução:** `commit_hash`, `matcher_version`, `elegibilidade_version`, `perfil_hash` (JSON canônico), `boot_timestamp` em `funil_telemetria`; `perfil_hash` também em `job_matches`. Extrair `ELEGIBILIDADE_VERSION` como constante.
- **A4 — `descartes_amostra`:** tabela nova com reservoir sampling por `(fonte, motivo)`, teto 5/execução, retenção 7d (DELETE dentro do sync), campos `trecho_descricao`, `regra_disparada`. Incluir amostra pequena de vagas aceitas.
- **D6** — `localizacaoInferida` em `funil_telemetria.descartes`.
- **D7** — coluna `metricas JSONB` em `funil_telemetria` (tempo + req + resultados por termo/coletor).
- **Doc:** CHANGELOG, HANDOFF (mesclar), README_ATUAL, DESIGN, CONFIG — tudo no mesmo diff.

## 6. Decisões

- Brave é orçamento controlado, não substituta de coleta direta.
- Matching é local, determinístico, sem LLM obrigatório.
- Candidatura é manual.
- PostgreSQL é a única fonte de estado.
- Sincronização é assíncrona (Vercel só encaminha; Render executa).
- `localizacoesAceitas` do perfil é soberana quando declarada explicitamente — **exceto** quando a localização da vaga contém bandeira estrangeira (Opção 2).
- LinkedIn só via Brave dork, nunca autenticado.
- Glassdoor só via Brave dork — sem coletor direto (risco de bloqueio + rendimento baixo).

## 7. Como retomar em nova conversa

**Scripts.**

Como o usuário executa no Git Bash (Windows):

- Scripts longos: `cat > arquivo.sh <<'SCRIPT_END' ... SCRIPT_END`, seguido de `chmod +x` e execução, TUDO em um único bloco. Nunca dividir em blocos separados nem pedir Ctrl+D.
- Heredocs aninhados com backticks ou `$` quebram o Git Bash. Prefira gerar `.cjs` por `cat > arquivo.cjs <<'CJS_END' ... CJS_END`.
- Nunca usar `node -e` com código complexo no Windows.
- Sempre rodar `npm run test:typecheck` e `npm run test` após alterar.

**Diagnóstico fora do repo.**

- Scripts e arquivos de diagnóstico vivem em `C:/Projetos/job-search-diag/`.
- Backups `.f*bak` e `.bak` também vão para lá.
- Nunca dentro do repo.

**Pedir arquivos que não foram lidos.**

- Peça 1-3 arquivos por vez. Nunca "o projeto inteiro".

**Devolver scripts.**

- Bloco único.
- Backup antes: `[ -f "$F.bak" ] || cp "$F" "$F.bak"`.
- `set -uo pipefail` (sem `-e`).
- Ao final, typecheck + testes.
- Se falhar, mostrar o trecho exato que não bateu.

## 8. Ambiente

- Windows + Git Bash.
- Node 24.13.1.
- Backend local usa `localhost:5432` (Postgres local). Para Neon, usar `.env.neon`.

## 9. Endpoints externos atuais

- Gupy: `https://portal.gupy.io/api/job-search/jobs?jobName=X&limit=100&offset=N`
- Sólides: `https://apigw.solides.com.br/jobs/v3/portal-vacancies?title=X&page=N`
- Vagas.com, GeekHunter, GetOnBoard: scraping próprio.
- Remotive, Remote OK, Jobicy, Arbeitnow: feeds próprios.
- ATS: Greenhouse, Lever, Workable, Ashby, Recruitee, InHire.

## 10. Pontos a evitar

- Integração sem necessidade validada.
- Duplicar fonte que já tem coletor direto.
- Brave para o que um portal público faz melhor.
- Regra de localização dentro de coletor.
- Matching diretamente em rotas.
- Automatizar candidatura.
- Commitar segredos.
- LLM no pipeline de sincronização.
- LinkedIn autenticado / Playwright no LinkedIn.
- Coletor direto do Glassdoor.

## 11. BLOCO DE RETOMADA

Copie o texto entre as linhas abaixo para iniciar a próxima conversa.

---

Estou continuando o desenvolvimento do projeto Job Search (C:\Projetos\job-search).

Stack: Node.js, TypeScript, Express 5, PostgreSQL (Neon), Next.js 16. Deploy: Vercel → Render (job-search-api-xap1) → Neon.
Commit atual: 43639d1 (Expansão de cobertura + fix de tipos). Suíte: 295/295 backend verdes (build local OK). Commits recentes: 162492a Otimização, c42482ba Cobertura parcial, 49ee153 Tipo Gupy, 43639d1 Fix definitivo. **Render: Auto-Deploy ativo. Build corrigido e deployado.**

O que foi resolvido nas últimas sessões (já está em produção):
1. Brave Search: Removido `freshness=pm` e adicionado conversor de `page_age` (string para ISO).
2. Sólides: Links apontam para o portal central (`vagas.solides.com.br`). Coletor ignora `isDisabled`.
3. Zumbis Temporais: Ingestão web bloqueia vagas sem data ou com mais de 21 dias.
4. Vagas.com: Classificador e coletor bloqueiam URLs de busca (`/vagas-de-...`).
5. SQL: Índices parciais (`jobs_active_reference_idx`, `jobs_source_url_idx`).
6. PingWind: `descricaoIndicaRestricaoFederalEstrangeira` bloqueia vagas remotas
   com descrição que cita programa federal ou agência governamental estrangeira
   (`public trust`, `security clearance`, `u s department`,
   `federal contractor`, etc.). Teste: `backend/tests/pingwind-regression.test.ts`.
7. ATS: `coletarFontesAtsAprendidas` paralelizada (`executarComPool`, 4 workers,
   pool `pg max=5`). `duracaoMs` passado em `registrarTelemetriaFonte` — corrige
   `duracao_ms` NULL nos registros ATS. Race em `falhas_consecutivas` era fantasma.

Estado das anomalias:
- As anomalias 3.1 (Gupy 23→256) e 3.3 (E1 - estabilidade da Gupy) foram REPRIORIZADAS para a Fase 1.
- Tuning de SQL (bulk insert, N+1) também foi movido para a Fase 1 para evitar duplo deploy.

Próximo passo: Iniciar a Fase 1 (Rastreabilidade e Diagnóstico).
- A3: commit_hash, perfil_hash, boot_timestamp em `funil_telemetria`.
- A4: tabela `descartes_amostra` com reservoir sampling.
- D6: `localizacaoInferida` na telemetria.
- D7: métricas JSONB na telemetria (tempo/req por termo).

Regras de trabalho:
- Recon antes de patch. 1 a 3 arquivos por vez.
- Scripts em bloco único (use `tee`, não `cat`).
- Backup antes de alterar. Typecheck + Testes + Build antes de commitar.
- Toda afirmação marcada com [observado], [hipótese], [não medido], [não encontrei].

---

*Última atualização: 20/10/2026.*
### Sessao 19/10 (PRIO 1 e PRIO 2)
- **Filtro Geografico:** Score >= 80 agora ignora falso negativo de localizacao. Vagas do Brave/LinkedIn/Indeed/Glassdoor voltaram a entrar.
- **Telemetria:** `execucaoId` propagado para o `processarVagasWeb`. Proxima sync tera os dados no `funil_telemetria`.

### Sessao 19/10 (Fechamento PRIO 1 e 2)
- **PRIO 1:** Score >= 80 forca `relevant` e ignora falso negativo de localizacao. Vagas do Indeed/LinkedIn/Agregadores resgatadas.
- **PRIO 2:** `execucaoId` agora e propagado para o `processarVagasWeb` e a interface o inclui corretamente. Proxima sync registrara a telemetria web.
