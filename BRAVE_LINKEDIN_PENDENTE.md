# Brave / LinkedIn / Glassdoor — Investigacao pendente (13/10/2026)

## 1. O problema

LinkedIn e Glassdoor com dados so de 25/08/2026 no banco. Nenhuma
coleta nova ha 49 dias. Indeed, Catho, InfoJobs, Pandape, Jooble,
Jobatus, 99jobs, empregare tambem com 0 vagas novas.

## 2. Arquitetura

Fontes diretas (sem Brave): Gupy, Solides, Vagas.com, GeekHunter,
GetOnBoard, Remotive, Remote OK, Jobicy, Arbeitnow, ATS.

Fontes via Brave (dorks web): LinkedIn, Indeed, Workday, agregadores
BR, portais BR, ATS descobertos, Remote Rocketship.

### Cadeia de chamada

Frontend controle-sincronizacao.tsx
  - Botao verde  -> executarSincronizacao(false) -> modo economico
  - Botao indigo -> modal -> executarSincronizacao(true) -> modo brave
       -> POST /api/sincronizacao com usarBrave, limiteChamadasBrave
           -> backend routes/jobs.ts:262 usarBrave = body.usarBrave === true
               -> job-sync.ts:301 permitirBuscaLive usarBrave
                   -> processamento-vagas-web.ts:56 checa permitirBuscaLive
                       -> job-discovery.ts -> discovery/brave-search.ts:41
                           process.env.BRAVE_SEARCH_API_KEY

### Orcamento

LIMITE_DIARIO_BRAVE = 30. LIMITE_MENSAL_BRAVE = 1000.
Cache persistido via buscarControleBuscaWeb / salvarControleBuscaWeb
de backend/src/repositories/controle-busca-web-repository.ts.

## 3. Observado

- BRAVE_SEARCH_API_KEY existe no Render (screenshot do painel).
- .env.neon local so tem DATABASE_URL.
- 25 vagas LinkedIn e 5 Glassdoor, todas com created_at 2026-08-25.
- funil_telemetria nao tem nenhuma linha de linkedin, glassdoor,
  brave, web, indeed — so fontes diretas + ATS.
- Frontend controle-sincronizacao.tsx esta correto: 2 botoes, logica ok.
- Backend routes/jobs.ts + sincronizacao/route.ts corretos.
- 55 queries geradas para LinkedIn, formato valido:
  site:linkedin.com/jobs/view (Analista X OR Analista Y) Brasil.

## 4. Nao medido

1. Nome real da tabela de cache. O recon com ILIKE cache nao achou.
   Ler controle-busca-web-repository.ts para descobrir.
2. Conteudo da tabela. Depois de achar o nome:
   SELECT * FROM nome LIMIT 5. Ver chamadasPorDia e data mais recente.
3. Qual botao o usuario clica em producao.
4. Brave retorna >0 para as queries? Testar direto com curl.
5. job-discovery.ts grava funil_telemetria? Se nao, e design.

## 5. Proximos passos

1. Ler backend/src/repositories/controle-busca-web-repository.ts.
   Achar o nome real da tabela (provavel controle_busca_web ou similar).
2. Consultar no Neon (read-only): SELECT * FROM nome LIMIT 5.
3. Perguntar ao usuario: qual botao clica em producao?
4. Testar Brave direto com a BRAVE_SEARCH_API_KEY do Render.

curl -sS "https://api.search.brave.com/res/v1/web/search?q=site%3Alinkedin.com%2Fjobs%2Fview+%22Analista+de+Suporte%22+Brasil&count=5&country=BR&freshness=pm&result_filter=web" -H "Accept: application/json" -H "X-Subscription-Token: $BRAVE_SEARCH_API_KEY"

Contar web.results.length. Se 0, freshness=pm esta filtrando demais.
Testar sem freshness.

5. Decidir patch conforme o que os passos 1-4 revelarem.

## 6. Arquivos ja lidos

search-queries.ts, brave-search.ts, job-discovery.ts (parcial),
processamento-vagas-web.ts (parcial), job-sync.ts, routes/jobs.ts,
controle-sincronizacao.tsx, sincronizacao/route.ts,
sincronizacao/status/route.ts.

## 7. Arquivos NAO lidos

- backend/src/repositories/controle-busca-web-repository.ts (critico).
- backend/src/discovery/page-classifier.ts.
- backend/src/services/vagas-web/triagem-vagas-web.ts.
- backend/src/scripts/diagnosticar-vagas-web.ts (utilitario pronto).

## 8. Regras

Read-only ate confirmar o que patch vai mudar. Sem chute.
Sem patch antes dos itens 4.1-4.4.
