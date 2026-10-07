# PROTOCOLO — Job Search

Contrato operacional do projeto. Consolidado ao longo das sessões de
outubro/2026. Não é específico de uma fase — vale para qualquer trabalho.

## 1. Regra de ouro

**Não inventar. Não supor.** Se algo não está claro, pedir recon
(1–3 arquivos por vez) antes de escrever qualquer linha. Se uma
informação não foi lida, dizer que não sabe em vez de preencher com
hipótese.

## 2. Formato dos scripts

### 2.1. Script único no Git Bash

```
cat > arquivo.sh <<'SCRIPT_END'
#!/usr/bin/env bash
set -uo pipefail
cd /c/Projetos/job-search
...
SCRIPT_END
chmod +x arquivo.sh
./arquivo.sh
```

- `set -uo pipefail` (com `-u` e `-o pipefail`, **sem `-e`**).
- Heredoc com aspas simples no delimitador para nenhuma expansão.
- Sempre em bloco único — nunca dividir entre mensagens nem pedir Ctrl+D.

### 2.2. Patches em arquivo via Node

Quando o patch exige lógica condicional (replace, verificação de
unicidade, backup), usar `.cjs` + `node arquivo.cjs`.

### 2.3. O que NUNCA fazer no Git Bash

- **`node -e` com código complexo**: o `!` dispara history expansion.
  Gerar `.cjs`.
- **`source` em `.env`**: quebra com CRLF, BOM, caracteres especiais.
  Ler com `fs.readFileSync` + parse, ou `dotenv`.
- **Backticks e `$()`** que o shell interpreta. Preferir `.cjs`.
- **Heredoc com expansão** quando o conteúdo tem `$` ou backticks.
  Usar aspas simples no delimitador.

## 3. Backups e rollback

- Antes de alterar arquivo: `[ -f "$F.bak" ] || cp "$F" "$F.bak"`.
- Durante fase longa: sufixo por fase (`.f2bak`, `.f3bak`, `.f4bak`).
- `.bak` está no `.gitignore`. Backups de fase são removidos no commit
  final da fase.

## 4. Validação obrigatória

Nada é considerado pronto sem:

- **Backend**: `npm run test:typecheck` + `npm run test` + `npm run build`.
- **Frontend**: `npm run test` + `npm run lint` + `npm run build`.
- Contagens esperadas reportadas (ex.: `207/207`, `54/54`).

Se um passo falha, **parar** e colar a saída literal antes de tentar
corrigir.

## 5. Commits

- **Código + docs no mesmo commit.** Um PR sem atualização de CHANGELOG,
  HANDOFF, README_ATUAL, DESIGN e CONFIG (quando aplicável) não está
  pronto.
- **Mensagem em arquivo** (`git commit -F arquivo`) — nunca inline com
  `-m "..."` contendo aspas ou quebras de linha.
- **`git add` explícito dos arquivos** quando o script acabou de ser
  criado. Evitar `git add -A` — captura o próprio `.sh` em execução.
- **Nunca `git push --force`** sem autorização explícita.
- **Nunca commit de segredos**: `.env`, `.env.local`, `.env.neon` estão
  no `.gitignore`.

## 6. Faseamento

Trabalho grande é dividido em fases:

1. **Recon** — só leitura, gera `.txt` para consulta.
2. **Análise** — ferramenta externa (knip) ou leitura manual.
3. **Classificação** — separar seguro / suspeito / requer decisão.
4. **Aplicação** — script `.cjs` ou `.sh` com backup.
5. **Validação** — typecheck + testes + lint + build.
6. **Commit + push** — só depois dos verdes.

Nunca pular da fase 1 para a 4.

## 7. Regras de escopo

- **Sem LLM no pipeline de sincronização.** Matching é local e
  determinístico.
- **Sem candidatura automática.** Candidatura é sempre manual.
- **Sem dependência nova** sem autorização explícita.
- **Brave é orçamento controlado**, não substituta de coleta direta.
- **PostgreSQL é a única fonte de estado.** Sem cache em memória fora
  dos coletores.

## 8. Comunicação

- Recon sempre antes de patch. Pedir **1–3 arquivos por vez**, nunca
  "o projeto inteiro".
- Se o arquivo não chegou, dizer que não chegou — não adivinhar.
- Ao reportar erro, colar a saída **literal** (não parafrasear).
- Quando o usuário pedir script, entregar em bloco único, com backup
  e validação.
- Se o pedido conflita com uma regra do projeto, apontar antes de
  executar.

## 9. Nomenclatura

- Arquivos: kebab-case (`job-matcher.ts`, `painel-vagas.tsx`).
- Tipos e funções: camelCase.
- Constantes globais: SCREAMING_SNAKE_CASE (`MATCHER_VERSION`).
- Migrations: `NNN_descricao.sql`
  (`016_add_idx_funil_telemetria_created_at.sql`).

## 10. Documentos do projeto

- `PRD.md` — requisitos de produto.
- `README.md` — setup e visão geral.
- `README_ATUAL.md` — snapshot do estado atual.
- `HANDOFF.md` — estado + bloco de retomada.
- `CHANGELOG.md` — histórico por sessão.
- `DESIGN.md` — arquitetura e decisões.
- `CONFIG.md` — env, deps, scripts, banco.
- `PROTOCOLO.md` — este documento.

## 11. Recon: script típico

```
cd /c/Projetos/job-search

F=recon-topico.txt
: > "$F"

for a in \
  backend/src/arquivo1.ts \
  backend/src/arquivo2.ts
do
  echo "===== $a =====" >> "$F"
  [ -f "$a" ] && cat "$a" >> "$F" || echo "(nao encontrado)" >> "$F"
  echo "" >> "$F"
done

wc -c "$F"
```

---

*Última atualização: 07/10/2026, após auditoria knip.*
