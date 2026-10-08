# HANDOFF — Job Search

## 0. Atualização 08/10/2026 (sessão LinkedIn + fontes)

- Extractor LinkedIn implementado (`backend/src/extractors/linkedin.ts`) — 9 testes, sem login, sem Playwright.
- `conversao-vaga-web.ts` infere `workplaceType` por texto (hybrid/on-site/unknown) quando `remoto = false`.
- 7 boards ATS novos em `fontes_ats` (Stone, BTG, Inter, C6, Cielo, XP, Sicredi) — ~1019 vagas brutas no próximo sync.
- 5 boards descartados por homonímia estrangeira (Bradesco sample, Accenture sample, Matera FR, Dock NL, Neon US).
- 260/260 testes backend verdes.

## 0. Atualização 08/10/2026 (sessão LinkedIn + fontes)

- Extractor LinkedIn implementado (`backend/src/extractors/linkedin.ts`) — 9 testes, sem login, sem Playwright.
- `conversao-vaga-web.ts` infere `workplaceType` por texto (hybrid/on-site/unknown) quando `remoto = false`.
- 7 boards ATS novos em `fontes_ats` (Stone, BTG, Inter, C6, Cielo, XP, Sicredi) — ~1019 vagas brutas no próximo sync.
- 5 boards descartados por homonímia estrangeira (Bradesco sample, Accenture sample, Matera FR, Dock NL, Neon US).
- 260/260 testes backend verdes.

## 1. Estado atual (08/10/2026)

Branch `main`. Produção: Vercel (frontend) → Render `job-search-api-xap1` (backend) → Neon (banco).

Suíte: **251 testes verdes** no backend. typecheck + build zerados.

Estado do banco (Neon, após saneamento de hoje):
- **741 vagas** relevant + novas (`viewed_at IS NULL`), após descarte de 227.
- 36 aplicadas, 19 ignoradas, 191+227 = 418 descartadas.

## 2. Concluído nesta sessão

- Fase 0.2 (inventário dos coletores) — `RELATORIO_FASE02.md` + `fase02-gerar-relatorio.cjs`.
- Trava geográfica v3 (diretiva v2) — matriz estrita de 4 pontos:
  - Presencial só RMPJP.
  - Híbrido em qualquer ponto do Brasil.
  - Remoto só com menção explícita ao Brasil.
  - Fallback conservador.
- Opção 2: bandeira estrangeira vence `localizacoesAceitas`.
- ATS Lever/Workable/Ashby/Recruitee/InHire passam a usar `interpretarModalidadeEstruturada`.
- Fail-fast confirmado no pipeline (`filtragem-vagas.ts` + `job-matcher.ts`).
- Contador `localizacaoInferida` na telemetria.
- Saneamento aplicado: 227 vagas `relevant` → `discarded`, com backup JSONB dos IDs.
- `PLANO_EXPANSAO.md` criado (LinkedIn via Brave dork, sites próprios piloto).

## 3. Pendências

- Fase 2 (futura): botão "segunda opinião por IA" on-demand (fora do pipeline).
- Expansão de sites próprios (piloto 30–50 empresas) — ver `PLANO_EXPANSAO.md`.
- Refinamento de queries Brave com base no perfil — idem.
- Reconciliar `jobs.source` com `funil_telemetria.fonte` (chave `ats:<provedor>:<board>` vs `"greenhouse"`/`"lever"`/…). Sem isso, curadoria de board é inconclusiva.

## 4. Decisões

- Brave é orçamento controlado, não substituta de coleta direta.
- Matching é local, determinístico, sem LLM obrigatório.
- Candidatura é manual.
- PostgreSQL é a única fonte de estado.
- Sincronização é assíncrona (Vercel só encaminha; Render executa).
- `localizacoesAceitas` do perfil é soberana quando declarada explicitamente — **exceto** quando a localização da vaga contém bandeira estrangeira (Opção 2).
- Sem IA no pipeline.
- LinkedIn só via Brave dork, nunca autenticado.

## 5. Como retomar em nova conversa

**Scripts.**

Como o usuário executa no Git Bash (Windows):

- Scripts longos: `cat > arquivo.sh <<'SCRIPT_END' ... SCRIPT_END`, seguido de `chmod +x` e execução, TUDO em um único bloco. Nunca dividir em blocos separados nem pedir Ctrl+D.
- Heredocs aninhados com backticks ou `$` quebram o Git Bash. Prefira gerar `.mjs` por `cat > arquivo.mjs <<'M_EOF' ... M_EOF`.
- Nunca usar `node -e` com código complexo no Windows.
- Sempre rodar `npm run test:typecheck` e `npm run test` após alterar.

**Pedir arquivos que não foram lidos.**

- Peça 1-3 arquivos por vez. Nunca "o projeto inteiro".
- Se precisar de vários, gere um script que imprime `===== caminho =====` + conteúdo de cada arquivo, salvando em `.txt` na raiz.

**Devolver scripts.**

- Bloco único `cat > arquivo.sh <<'SCRIPT_END' ... SCRIPT_END`.
- Backup antes: `[ -f "$F.bak" ] || cp "$F" "$F.bak"`.
- `set -uo pipefail` (sem `-e`).
- Patch de arquivo via `node <<'NODE' ... NODE` com `fs.readFileSync` + `replace` + `writeFileSync`.
- Ao final, typecheck + testes.
- Se falhar, mostrar o trecho exato que não bateu.

## 6. Ambiente

- Windows + Git Bash.
- Node 24.13.1.
- Backend local usa `localhost:5432` (Postgres local). Para Neon, usar `.env.neon` (URL de conexão do Neon, não vai para o Git).

## 7. Endpoints externos atuais

- Gupy: `https://portal.gupy.io/api/job-search/jobs?jobName=X&limit=100&offset=N`
- Sólides: `https://apigw.solides.com.br/jobs/v3/portal-vacancies?title=X&page=N`
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

Estou continuando o desenvolvimento do projeto Job Search (C:\Projetos\job-search).

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
