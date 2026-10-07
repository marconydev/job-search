# HANDOFF — Job Search

## 1. Estado atual (07/10/2026)

Branch `main`. Últimos commits:
- `7098d68` — fix(engine): veto geográfico por inferência de modalidade
- `dceb9e2` — feat(engine): trava geográfica em 3 estados
- `2f98be3` — feat: correção de endpoints, M1-M11, telemetria e priorização de ATS

Produção: Vercel (frontend) → Render `job-search-api-xap1` (backend) → Neon (banco).

Suíte: 186 testes verdes.

## 2. Concluído nesta sessão

- Endpoints Gupy e Sólides corrigidos.
- Migrations 007 a 015 aplicadas no Neon.
- M1, M2, M3 (trava 3 estados), M4, M9, M11, C11.
- ATS priorizados por produtividade.
- `titulosExcluidos` expandido.
- Variações de EUA em `localizacoesEstrangeiras`.
- Re-análise em massa no Neon (1197 análises).

## 3. Pendências

- Fase 1A: expansão de vocabulário em `search-queries.ts` (7 famílias).
- Fase 1B: observabilidade agregada.
- Fase 2 (futura): botão "segunda opinião por IA" on-demand.

## 4. Decisões

- Brave é orçamento controlado, não substituta de coleta direta.
- Matching é local, determinístico, sem LLM obrigatório.
- Candidatura é manual.
- PostgreSQL é a única fonte de estado.
- Sincronização é assíncrona (Vercel só encaminha; Render executa).
- `localizacoesAceitas` do perfil é soberana quando declarada explicitamente.
- Sem IA no pipeline.

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
- Formato:
    cat > coletar.sh <<'EOF'
    #!/usr/bin/env bash
    set -uo pipefail
    cd /c/Projetos/job-search
    ARQS=(backend/src/x.ts backend/src/y.ts)
    OUT="coleta.txt"
    : > "$OUT"
    for a in "${ARQS[@]}"; do
      echo "===== $a =====" >> "$OUT"
      cat "$a" >> "$OUT" 2>/dev/null || echo "(não encontrado)" >> "$OUT"
      echo "" >> "$OUT"
    done
    wc -c "$OUT"
    EOF
    chmod +x coletar.sh && ./coletar.sh

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

## 9. BLOCO DE RETOMADA

Copie o texto entre as linhas abaixo para iniciar a próxima conversa.

---

Estou continuando o desenvolvimento do projeto Job Search (C:\Projetos\job-search).

Stack: Node.js, TypeScript, Express 5, PostgreSQL (pg), Next.js 16, React 19. Deploy: Vercel (frontend) → Render (job-search-api-xap1) → Neon.

Estado atual (07/10/2026): 186 testes verdes. Últimos commits:
- 7098d68 fix(engine): veto geográfico por inferência de modalidade
- dceb9e2 feat(engine): trava geográfica em 3 estados
- 2f98be3 feat: correção de endpoints, M1-M11, telemetria e priorização de ATS

Concluído: endpoints Gupy e Sólides corrigidos; migrations 007-015 no Neon; M1 telemetria; M2 termos; M4 desconto; M9; M11; C11; trava geográfica 3 estados (presencial fora de JP/PB vetado, híbrida e remota livres no Brasil); ATS priorizados.

Pendências:
- Fase 1A: expansão de vocabulário em search-queries.ts (7 famílias: suporte, sistemas, infraestrutura, implantacao, processos, dados, geral) com sinônimos em PT/EN.
- Fase 1B: observabilidade agregada (GET /jobs/telemetria/resumo + componente).
- Fase 2 (futura): botão "segunda opinião por IA" on-demand.

Regras de trabalho: sem LLM no pipeline; scripts em bloco único cat > arquivo.sh <<'SCRIPT_END' ... SCRIPT_END; backup antes de alteração; typecheck + testes antes de considerar pronto; backend local usa Postgres local, para Neon usar .env.neon.

Leia HANDOFF.md e README_ATUAL.md antes de qualquer coisa. Depois me diga se está pronto para continuar a Fase 1A (vocabulário).
