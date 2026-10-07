#!/usr/bin/env bash
set -uo pipefail
cd /c/Projetos/job-search

echo "================================================"
echo "1. Remover backups de fase (.f2bak/.f3bak/.f4bak)"
echo "================================================"
find . -name '*.f2bak' -not -path '*/node_modules/*' -print -delete
find . -name '*.f3bak' -not -path '*/node_modules/*' -print -delete
find . -name '*.f4bak' -not -path '*/node_modules/*' -print -delete
echo "[ok]"

echo ""
echo "================================================"
echo "2. Remover scripts temporarios"
echo "================================================"
rm -f fase2-remover-funcoes.cjs
rm -f fase3-remover-exports.cjs
rm -f fase4-refatorar-analisador.cjs
rm -f fase4-fix.cjs
rm -f fase1b-frontend-final.sh
rm -f add-audit.cjs
echo "[ok]"

echo ""
echo "================================================"
echo "3. Adicionar script audit na raiz"
echo "================================================"

cat > add-audit.cjs <<'ADDAUDIT_EOF'
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
p.scripts = p.scripts || {};
if (!p.scripts.audit) p.scripts.audit = 'knip';
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
console.log('[package.json] scripts:', Object.keys(p.scripts).join(', '));
ADDAUDIT_EOF

node add-audit.cjs
rm -f add-audit.cjs

echo ""
echo "================================================"
echo "4. Verificar artefatos residuais"
echo "================================================"
echo "--- .f2bak/.f3bak/.f4bak restantes ---"
find . -name '*.f2bak' -o -name '*.f3bak' -o -name '*.f4bak' 2>/dev/null | grep -v node_modules || echo "(nenhum)"
echo "--- .bak restantes ---"
find . -name '*.bak' -not -path '*/node_modules/*' 2>/dev/null || echo "(nenhum)"

echo ""
echo "================================================"
echo "5. Git status ANTES do add"
echo "================================================"
git status --short

echo ""
echo "================================================"
echo "6. Git add + commit"
echo "================================================"
git add -A

echo "--- conteudo do indice ---"
git diff --cached --name-status

cat > .commit-cleanup-msg <<'MSG_EOF'
chore(cleanup): auditoria knip - remove codigo morto e artefatos

- Removidas 2 funcoes mortas: listUnmatchedJobs,
  registrarFontesAtsDosJobsExistentes.
- Removidos 20 exports decorativos no backend e 14 no frontend
  (apenas a palavra export, sem mudanca de comportamento).
- Refatorado analisador-curriculo.ts: intermediario de 1 linha
  removido, import atualizado em perfil.ts e no teste.
- Removido apps/ vazio e backups/job-search-local.backup (dump
  PostgreSQL antigo, nao rastreado).
- Removidos 10 arquivos .bak de sessoes anteriores e os
  .f2bak/.f3bak/.f4bak do processo de auditoria.
- Adicionado script "audit" na raiz (knip) para auditorias
  futuras.
- 207/207 backend + 54/54 frontend + typecheck + lint + build
  zerados.
MSG_EOF

git commit -F .commit-cleanup-msg
RC=$?
rm -f .commit-cleanup-msg
if [ "$RC" -ne 0 ]; then
  echo "[FALHOU] commit"
  exit "$RC"
fi

echo ""
echo "================================================"
echo "7. Log antes do push"
echo "================================================"
git log --oneline -4

echo ""
echo "================================================"
echo "8. Push origin main"
echo "================================================"
git push origin main
RC=$?
if [ "$RC" -ne 0 ]; then
  echo "[FALHOU] push (codigo $RC) - nao force nada"
  exit "$RC"
fi

echo ""
echo "================================================"
echo "9. Estado final"
echo "================================================"
git status --short
git log --oneline -1
echo ""
echo "DONE"
