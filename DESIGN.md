# DESIGN — Job Search

## 1. Princípios

- separar descoberta de matching
- separar coleta direta de descoberta web
- persistência em repositórios
- regra de negócio fora das rotas
- preservar decisão manual do usuário
- Brave como descoberta complementar
- processar em lotes e liberar o event loop
- não automatizar candidatura

## 2. Arquitetura

    Frontend Next.js (Vercel)
          |
    API server-side + Bearer token
          |
    Backend Express (Render)
          |
     +----+----+
     |    |    |
   Collectors  Discovery  Perfil/API
     |         |              |
     |       Brave + cache    |
     +----+----+              |
          |                   |
    Normalizacao / Filtro / Matcher / Dedup
          |                   |
    PostgreSQL (Neon) --------+
          |
    Dashboard

## 3. Fluxo de sincronização

`POST /jobs/sync` → trava no PostgreSQL → responde 202 → background com 4 etapas:

1. Fontes diretas (9 coletores + filtro pré-importação).
2. Web (cache + Brave opcional).
3. ATS aprendidos (limite 8/execução, ordenados por produtividade).
4. Análise (`analyzePendingJobs`).

Frontend consulta `/jobs/sync/status` durante a execução.

## 4. Resiliência

`estado_sincronizacao` singleton com estados `ociosa`, `executando`, `concluida`, `falhou`, `interrompida`. Heartbeat 20s. Se parar por 2 min, marcada como interrompida.

## 5. Matching (ordem em `job-matcher.ts`)

1. `titulosExcluidos` → score 0.
2. `avaliarElegibilidadeBrasil` (com `perfil.localizacoesAceitas`).
3. `avaliarPoliticaVagaBrasil` — presencial fora de JP/PB → score 0; título fora do foco desconta 15.
4. Cargo principal 60, relacionado 45, nenhum 0.
5. Remoto +10; localização compatível +10.
6. Competências 4x (máx 20), formação (máx 8), experiência (máx 8), cursos (máx 6).
7. Score final 0–100, corte em `MIN_SCORE_RELEVANT = 60`.

`MATCHER_VERSION = 3`.

## 6. Modalidade (3 estados)

`WorkplaceType = "remote" | "hybrid" | "on-site" | "unknown"`.

Coletores alimentam com dado estruturado quando disponível (Gupy `workplaceType`, Sólides `jobType`, GetOnBoard `remote_modality`, ATS conforme API). Quando `unknown`, o matcher infere pela localização:

- Contém "remote"/"remoto" → remote
- Contém UF brasileira ou estado por extenso → on-site (veta se fora de JP/PB)
- Só "Brasil", "LATAM", "null" → unknown (aceito, sem veto)

## 7. Elegibilidade geográfica

`elegibilidade-localizacao.ts` separa localização, descrição e título. Regiões amplas só são compatíveis quando a vaga é remota confirmada. Exclusões explícitas ("except Brazil") vencem.

Lista de `localizacoesEstrangeiras` inclui: `us`, `u.s.`, `usa`, `eua`, `estados unidos`, `north america`.

## 8. Ciclo de vida

`JOB_LIFECYCLE`: `maxAgeDays=21`, `requireConfirmationAfterDays=15`, `confirmationFreshnessDays=7`.

## 9. Hash de conteúdo

`content-hash.ts` calcula SHA-256 de `title + company + location + description + remote`. `refreshExistingJobs` só marca para reanálise quando o hash mudou.

## 10. Telemetria

`funil_telemetria`: `execucao_id`, `fonte`, `coletadas`, `apos_janela`, `apos_elegibilidade`, `apos_matcher`, `importadas`, `duplicadas`, `descartes` JSONB (8 chaves), `erros` JSONB, `duracao_ms`. Endpoint `GET /jobs/telemetria`.

## 11. Priorização de ATS

`fontes_ats.coletas_sem_aderentes` incrementa a cada coleta sem vaga aderente, zera quando dá resultado. Fila ordena por `LEAST(coletas_sem_aderentes, 10) ASC`.

## 12. Vocabulário de busca

`search-queries.ts` centraliza o vocabulário de títulos e palavras-chave consumido por:

- coleta nativa (Gupy, Sólides);
- descoberta Brave (plataformas complementares, grupos de empresas, regiões).

Famílias: `suporte`, `sistemas`, `infraestrutura`, `implantacao`, `processos`, `dados`, `geral`. Cada família específica tem `tituloPrincipal` e `titulosRelacionados` em `ESTRATEGIAS_FAMILIAS_PORTAIS`, além de palavras-chave classificatórias em `PALAVRAS_FAMILIA`.

Ordem final dos termos da coleta nativa: cargos do perfil (M2) → títulos principais por família → títulos relacionados. `geral` permanece sem termos para não gerar consulta genérica.

A coleta nativa da Gupy limita os relacionados a `LIMITE_RELACIONADOS_POR_FAMILIA_GUPY = 5` por família, garantindo que todas as famílias ativas do perfil apareçam antes do corte final de 30 termos. A Sólides reaproveita a mesma lista, cortada em 20.

## 13. Mapa de arquivos

backend/src/collectors/: index.ts, gupy.ts, solides.ts, vagas-com.ts, geekhunter.ts, getonboard.ts, remotive.ts, remote-ok.ts, jobicy.ts, arbeitnow.ts, ats.ts, collector-utils.ts

backend/src/config/: matcher.ts, job-lifecycle.ts, search-queries.ts, perfil-padrao.ts

backend/src/database/: connection.ts

backend/src/discovery/: brave-search.ts, page-classifier.ts, page-inspector.ts

backend/src/extractors/: gupy.ts, solides.ts, greenhouse.ts, lever.ts, workable.ts, smartrecruiters.ts

backend/src/repositories/: job-repository.ts, job-match-repository.ts, perfil-profissional-repository.ts, fonte-ats-repository.ts, controle-busca-web-repository.ts, estado-sincronizacao-repository.ts, funil-telemetria-repository.ts

backend/src/routes/: jobs.ts, perfil.ts

backend/src/services/: job-sync.ts, sincronizacao-assincrona.ts, job-matcher.ts, job-analysis.ts, filtragem-vagas.ts, job-import.ts, job-discovery.ts, processamento-vagas-web.ts, fontes-ats.ts, elegibilidade-localizacao.ts, politica-vagas-brasil.ts, modalidade-vaga.ts, content-hash.ts, conversao-vaga-web.ts, status-vaga.ts, perfil-profissional-service.ts, leitor-curriculo.ts, analisador-curriculo.ts, curriculo/, vagas-web/triagem-vagas-web.ts

backend/src/scripts/: sync-jobs.ts, diagnosticar-vagas-web.ts, test-page-inspector.ts

backend/src/types/: collector.ts, job.ts, perfil-profissional.ts, discovery.ts, page-inspection.ts, elegibilidade.ts, fonte-ats.ts, importacao-curriculo.ts, processamento-web.ts

database/migrations/: 001 a 015.

frontend/src/: A CONFIRMAR em nova sessão (lido parcialmente).
