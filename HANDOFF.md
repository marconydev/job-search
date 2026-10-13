# HANDOFF — Job Search

## 1. Estado atual (12/10/2026)

Branch `main`. Produção: Vercel (frontend) → Render `job-search-api-xap1` (backend) → Neon (banco). Auto-Deploy = **Yes** no Render.

**Últimos commits:**
- `baa8810` fix(ats): fila com backoff temporal + classificacao de falha permanente/transitoria
- `d0e4166` feat(web): extractor LinkedIn + inferencia de modalidade + 7 boards ATS
- `b9bd095` feat(engine): trava geográfica v3 + saneamento + Fase 0.2
- `e7385ab` docs(fase0): baseline do Neon e relatorio inicial

**Suíte:** 265/265 testes backend verdes. typecheck + build zerados.

**Estado do banco (Neon):** 898 vagas Gupy; ~791 relevant+new no total; 505 vagas obsoletas ativas da Gupy.

## 2. Concluído nas sessões de 07–12/10/2026

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

## 3. Auditoria em andamento (12/10/2026)

Auditoria read-only em curso para investigar 3 anomalias.

### 3.1 Queda `23 → 256` incompatíveis da Gupy em 2 syncs consecutivos

Syncs `2dd8743c` (23:58:09Z de 08/10) e `79d97668` (00:13:04Z de 09/10), ambos rodando com a trava v3 ativa.

**Descartado:**
- **Código** — replay offline dos 3 commits (`b9bd095`, `d0e4166`, `baa8810`) sobre as mesmas 898 linhas deu resultado byte-a-byte idêntico: `incompat=257, inferida=4, compativel=612, indefinida=29, matchAderente=599`.
- **Deploy** — Auto-Deploy = Yes; trava v3 ativa nos 3 syncs.
- **Perfil** — `updated_at` anterior aos dois syncs; sem cache em `obterPerfilProfissional`.

**Em aberto:** hipótese `F1` (input da API da Gupy mudou) ou falso positivo de `descricaoRestringeParaOutroPais`.

### 3.2 Falso positivo em Curitiba — RESOLVIDO em 13/10

Causa: `descricaoRestringeParaOutroPais` aceitava indicador de restrição (`must reside in`) e bandeira estrangeira (`u.s.`, `global`, `north america`) em qualquer parte da descrição, sem exigir relação entre eles. Vagas `3514` (INSIDE SALES SUPPORT ANALYST) e `3523` (SERVICE DESK ANALYST II) tinham "U.S.-based company" na abertura corporativa + "Must reside in Curitiba, PR" nas informações adicionais. Corrigido: co-ocorrência obrigatória na mesma janela de 100 chars. Vagas existentes com `discarded` pelo motivo antigo **não são reavaliadas automaticamente** — pendente de re-análise.

### 3.3 E1 — estabilidade da API da Gupy

Script `C:/Projetos/job-search-diag/e1-gupy.cjs` parcialmente executado. Fase A (3 fetches de `"analista de suporte"` espaçados 125s) + Fase B (`offset=100/200`). Payloads salvos em `C:/Projetos/job-search-diag/e1-payloads/`.

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

Stack: Node.js, TypeScript, Express 5, PostgreSQL (pg), Next.js 16, React 19. Deploy: Vercel (frontend) → Render (job-search-api-xap1) → Neon.

Commit atual em produção: baa8810. Suíte 265/265 backend verdes. Auto-Deploy = Yes no Render.

Estado do banco: 898 vagas Gupy, 791 relevant+new, 505 vagas obsoletas ativas da Gupy.

Em andamento: auditoria read-only investigando 3 anomalias — (1) queda 23→256 incompatíveis da Gupy entre 2dd8743c e 79d97668 (código e deploy descartados; hipótese F1 em aberto), (2) falso positivo de descricaoRestringeParaOutroPais em vagas hybrid de Curitiba, (3) E1 (estabilidade da API da Gupy).

Débitos técnicos confirmados: D2 (coletores diretos não marcam fechadas — 505 obsoletas), D3 (unavailable_at sem motivo), D4 (sem commit por execução), D5 (sem snapshot de perfil), D6 (localizacaoInferida não persistido), D7 (sem tempo/req por termo), D8 (MATCHER_VERSION não bumpou em b9bd095).

Fase 1 aprovada em desenho: A3 (rastreabilidade por execução — commit_hash, perfil_hash, boot_timestamp), A4 (descartes_amostra com reservoir sampling, retenção 7d dentro do sync), D6 (localizacaoInferida na telemetria), D7 (metricas JSONB). Branch, testes, migration reversível, sem merge.

Scripts de diagnóstico vivem em C:/Projetos/job-search-diag/ (fora do repo).

Regras de trabalho: read-only durante auditoria; sem LLM no pipeline; scripts em bloco único; backup antes; typecheck + testes + lint + build antes de considerar pronto; marcar toda afirmação como [observado]/[hipótese]/[não encontrei]/[não medido].

Leia HANDOFF.md, README_ATUAL.md e PROTOCOLO.md antes de qualquer coisa. Depois me diga se está pronto para continuar. Próximo passo sugerido: rodar o script C:/Projetos/job-search-diag/7-service-desk.cjs para inspecionar a descrição das vagas hybrid de Curitiba.
