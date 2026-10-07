# DESIGN — Job Search

## 1. Princípios

Separar descoberta de matching. Separar coleta direta de descoberta web. Persistência em repositórios. Regra de negócio fora das rotas. Preservar decisão manual. Brave como descoberta complementar. Processar em lotes. Não automatizar candidatura.

## 2. Arquitetura

    Frontend Next.js
          │
    API server-side + Bearer token
          │
    Backend Express
          │
     ┌────┼────┐
     │    │    │
    Collectors  Discovery  Perfil/API
     │         │              │
     │       Brave + cache    │
     │         │              │
     └────┼────┘              │
          │                   │
     Normalização / Filtro Brasil / Matcher / Dedup
          │                   │
     PostgreSQL ──────────────┘
          │
     Dashboard

## 3. Fluxo de sincronização

`POST /jobs/sync` → trava no PostgreSQL → responde 202 → background com 4 etapas:

1. Fontes diretas.
2. Web (cache + Brave opcional).
3. ATS aprendidos (limite de 8 por execução).
4. Análise (`analyzePendingJobs`).

Frontend consulta `/jobs/sync/status` durante execução.

## 4. Resiliência

`estado_sincronizacao` é singleton com estados `ociosa`, `executando`, `concluida`, `falhou`, `interrompida`. Heartbeat a cada 20s. Se parar de atualizar por 2 minutos, marcada como interrompida.

## 5. Matching

Ordem em `job-matcher.ts`:

1. `titulosExcluidos` → score 0.
2. `avaliarElegibilidadeBrasil` (com `perfil.localizacoesAceitas`, M11).
3. `avaliarPoliticaVagaBrasil` — título fora do foco em português desconta 15 pontos (M4), sem veto geográfico (M3).
4. Cargo principal 60, relacionado 45, nenhum 0 (curto-circuito).
5. Remoto +10; localização compatível +10.
6. Competências 4× (máx 20), formação (máx 8), experiência (máx 8), cursos (máx 6).
7. Score final `Math.max(0, Math.min(pontuacao, 100))`.
8. Corte: `MIN_SCORE_RELEVANT = 60`.

`MATCHER_VERSION = 3`. Incrementar quando regra mudar.

## 6. Elegibilidade geográfica

`elegibilidade-localizacao.ts` separa localização, descrição e título. Regiões amplas (`Worldwide`, `LATAM`, `Americas`) só são compatíveis quando a vaga é remota confirmada. Exclusões explícitas ("except Brazil") vencem qualquer declaração de `localizacoesAceitas` do perfil.



## 7. Ciclo de vida

`JOB_LIFECYCLE`: `maxAgeDays=21`, `requireConfirmationAfterDays=15`, `confirmationFreshnessDays=7`.

## 8. Hash de conteúdo (C11)

`content-hash.ts` calcula SHA-256 de `title + company + location + description + remote` após normalizar HTML e espaços. `createJob` grava em `jobs.content_hash`. `refreshExistingJobs` só marca para reanálise quando o hash mudou.

## 9. Telemetria (M1)

`funil_telemetria` guarda contadores por `execucao_id` e `fonte`: `coletadas`, `apos_janela`, `apos_elegibilidade`, `apos_matcher`, `importadas`, `duplicadas`, `descartes` JSONB, `erros` JSONB, `duracao_ms`. Endpoint `GET /jobs/telemetria` expõe últimas N linhas (máx 500) ou filtra por execução.

## 10. Mapa de arquivos

### backend/src/collectors/

- index.ts — registro dos coletores ativos.
- gupy.ts, solides.ts, vagas-com.ts, geekhunter.ts, getonboard.ts — portais brasileiros.
- remotive.ts, remote-ok.ts, jobicy.ts, arbeitnow.ts — feeds remotos.
- ats.ts — coletores dos ATS aprendidos.
- collector-utils.ts — helpers compartilhados.

### backend/src/config/

- matcher.ts — MATCHER_VERSION, MIN_SCORE_RELEVANT, PENALIDADE_TITULO_FORA_FOCO.
- job-lifecycle.ts — ciclo de vida.
- search-queries.ts — termos de busca.
- perfil-padrao.ts — perfil inicial.

### backend/src/database/

- connection.ts — pool pg com listener de erro.

### backend/src/discovery/

- brave-search.ts, page-classifier.ts, page-inspector.ts.

### backend/src/extractors/

- gupy.ts, solides.ts, greenhouse.ts, lever.ts, workable.ts, smartrecruiters.ts.

### backend/src/repositories/

- job-repository.ts — CRUD, refreshExistingJobs, reconcileCompleteSourceAvailability, content_hash.
- job-match-repository.ts — análise local.
- perfil-profissional-repository.ts — singleton do perfil.
- fonte-ats-repository.ts — ATS aprendidos.
- controle-busca-web-repository.ts — cache/orçamento Brave.
- estado-sincronizacao-repository.ts — estado da sync.
- funil-telemetria-repository.ts — telemetria (M1).

### backend/src/routes/

- jobs.ts — vagas, dashboard, sync, telemetria.
- perfil.ts — perfil e importação de currículo.

### backend/src/services/

- job-sync.ts — orquestra as 4 etapas.
- sincronizacao-assincrona.ts — trava + heartbeat.
- job-matcher.ts — matcher determinístico.
- job-analysis.ts — análise pós-importação.
- filtragem-vagas.ts — filtro pré-importação e diagnóstico.
- job-import.ts, job-discovery.ts, processamento-vagas-web.ts.
- fontes-ats.ts — coleta ATS aprendidos.
- elegibilidade-localizacao.ts — regra Brasil + M11.
- politica-vagas-brasil.ts — política de título e geografia.
- modalidade-vaga.ts, content-hash.ts, conversao-vaga-web.ts, status-vaga.ts.
- perfil-profissional-service.ts, leitor-curriculo.ts, analisador-curriculo.ts, curriculo/.
- vagas-web/triagem-vagas-web.ts.

### backend/src/scripts/

- sync-jobs.ts, diagnosticar-vagas-web.ts, test-page-inspector.ts.

### backend/src/types/

- collector.ts, job.ts, perfil-profissional.ts, discovery.ts, page-inspection.ts, elegibilidade.ts, fonte-ats.ts, importacao-curriculo.ts, processamento-web.ts.

### backend/tests/

- Suíte com 175 casos.

### database/migrations/

- 001 a 013. A 012 cria funil_telemetria. A 013 adiciona jobs.content_hash.

### frontend/src/

- A CONFIRMAR. Nunca foi lido nesta sessão.
