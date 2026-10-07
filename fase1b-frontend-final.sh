#!/usr/bin/env bash
set -uo pipefail
cd /c/Projetos/job-search

echo "================================================================"
echo "1. Corrigir duplicatas em HANDOFF.md e README_ATUAL.md"
echo "================================================================"

cat > fix-duplicatas.cjs <<'FIX_EOF'
const fs = require('fs');

function fix(file, filtro, tag) {
  const antes = fs.readFileSync(file, 'utf8');
  const linhas = antes.split('\n');
  const resultado = [];
  let removidas = 0;
  for (const linha of linhas) {
    if (filtro(linha) === 'remover') { removidas++; continue; }
    resultado.push(linha);
  }
  if (removidas === 0) { console.log('[skip]', tag); return; }
  fs.writeFileSync(file, resultado.join('\n'));
  console.log('[ok]', tag, '- removidas', removidas);
}

fix('HANDOFF.md', (l) => {
  if (l === '- Fase 2 (futura): botao "segunda opiniao por IA" on-demand.') return 'remover';
  return 'manter';
}, 'HANDOFF sem-acento');

let vistos = 0;
fix('README_ATUAL.md', (l) => {
  const alvo = '- Fase 2 (futura): botão "segunda opinião por IA" on-demand.';
  if (l === alvo) { vistos++; if (vistos > 1) return 'remover'; }
  return 'manter';
}, 'README duplicata com-acento');
FIX_EOF

node fix-duplicatas.cjs
RC=$?
if [ "$RC" -ne 0 ]; then
  echo "[FALHOU] fix-duplicatas"
  exit "$RC"
fi

echo ""
echo "--- conferencia ---"
echo "HANDOFF Fase 2 (esperado 2): $(grep -c 'Fase 2' HANDOFF.md)"
echo "README  Fase 2 (esperado 1): $(grep -c 'Fase 2' README_ATUAL.md)"

echo ""
echo "================================================================"
echo "2. Limpar scripts temporarios"
echo "================================================================"
rm -f fix-duplicatas.cjs
rm -f patch-changelog.cjs
rm -f patch-docs.cjs
rm -f patch-api-servidor.cjs
rm -f patch-page.cjs
rm -f patch-painel-vagas.cjs
rm -f frontend/patch-api-servidor.cjs
rm -f frontend/patch-page.cjs
rm -f frontend/patch-painel-vagas.cjs
rm -f frontend/recon-frontend.txt
rm -f frontend/recon-frontend-2.txt
rm -f frontend/recon-frontend-3.txt
echo "[ok] temporarios removidos"

echo ""
echo "================================================================"
echo "3. Frontend: lint"
echo "================================================================"
cd /c/Projetos/job-search/frontend
npm run lint
RC=$?
if [ "$RC" -ne 0 ]; then
  echo "[FALHOU] lint - commit abortado"
  exit "$RC"
fi

echo ""
echo "================================================================"
echo "4. Frontend: build"
echo "================================================================"
npm run build
RC=$?
if [ "$RC" -ne 0 ]; then
  echo "[FALHOU] build - commit abortado"
  exit "$RC"
fi

echo ""
echo "================================================================"
echo "5. Frontend: test"
echo "================================================================"
npm run test
RC=$?
if [ "$RC" -ne 0 ]; then
  echo "[FALHOU] test - commit abortado"
  exit "$RC"
fi

echo ""
echo "================================================================"
echo "6. Git: add + commit"
echo "================================================================"
cd /c/Projetos/job-search

git add -A
echo "--- arquivos no indice ---"
git diff --cached --name-status

cat > .commit-fase1b-frontend <<'MSG_EOF'
feat(telemetria): painel retratil + suite Vitest/RTL (Fase 1B-Frontend)

- Painel retratil `Telemetria` no dashboard, fechado por padrao,
  com botoes [7d|14d|30d] e Atualizar.
- Funil da ultima execucao (6 contadores), serie diaria em barras
  Tailwind e top motivos de descarte em barras horizontais.
- Rota-proxy GET /api/telemetria/resumo com sanitizacao de ?dias
  (default 7, range 1..30) e propagacao de status do backend.
- Utilitarios puros em src/lib/telemetria-utils.ts.
- Suite Vitest + React Testing Library: 54 testes (utils 28,
  rota 12, componente 10, integracao 4).
- Configs vitest.config.mts, vitest.setup.ts e stub de
  server-only. Scripts test, test:watch, test:ui.
- @types/node de ^20 para ^24 (runtime Node 24.13.1).
- page.tsx carrega obterResumoTelemetria(7) em paralelo com o
  dashboard; falha da telemetria nao derruba a pagina.
- painel-vagas.tsx recebe resumoTelemetriaInicial e monta
  <Telemetria> abaixo de <ControleSincronizacao>.
- api-servidor.ts ganha obterResumoTelemetria(dias).
- Docs: CHANGELOG, HANDOFF, README_ATUAL, DESIGN (13 e 14),
  CONFIG (deps e scripts).
MSG_EOF

git commit -F .commit-fase1b-frontend
RC=$?
rm -f .commit-fase1b-frontend
if [ "$RC" -ne 0 ]; then
  echo "[FALHOU] commit"
  exit "$RC"
fi

echo ""
echo "--- log ---"
git log --oneline -3
echo ""
git log -1 --format=%B

echo ""
echo "--- status final ---"
git status --short
echo ""
echo "DONE"
