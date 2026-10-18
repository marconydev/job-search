# Changelog

## [2026-10-20 — Fix Vagas.com: bloqueio de URLs de busca]

### Fixed

- `backend/src/discovery/page-classifier.ts` — URLs `/vagas-de-...` do Vagas.com agora são
  classificadas como `desconhecido` (não como `vagas`). A Descoberta Web do Brave estava
  salvando páginas de busca como vagas individuais.
- `backend/src/collectors/vagas-com.ts` — trava de segurança: se a URL do card contiver
  `/vagas-de-`, a vaga é ignorada no coletor nativo (defesa em profundidade).

### Saneamento

- 10 vagas falsas (URLs de busca) foram deletadas do banco.

## [2026-10-19 — Auditoria Tech Lead: Performance SQL e Expansao de Busca]

### Added

- `backend/src/discovery/brave-search.ts` — Adicionado conversor `converterBraveAgeParaData`.
  O Brave retorna datas relativas (ex: "2 days ago"); o código agora converte para ISO real.
- `backend/src/services/processamento-vagas-web.ts` — Reativada a persistência de descobertas
  da web, condicionada à existência de `publishedAtEstimado` válido (Blindagem 2.0).
- `database/migrations/018_...` (aplicado via script) — Criados índices parciais para otimização
  de leitura: `jobs_active_reference_idx` e `jobs_source_url_idx`.

### Changed

- `backend/src/config/search-queries.ts` — Aumento da cobertura de busca.
  `LIMITE_RELACIONADOS_POR_FAMILIA_GUPY` subiu de 5 para 8. `slice(0, 30)` subiu para 40.

## [2026-10-18 — Blindagem: fim das vagas zumbis (falsos positivos temporais)]

### Fixed

- `backend/src/services/processamento-vagas-web.ts` — Descoberta web (Brave) não persiste mais
  recomendações soltas sem data. Se não há como extrair a data da vaga, ela é ignorada.
- `backend/src/services/processamento-vagas-web.ts` — Filtro rígido: vagas extraídas (ATS) com
  `publishedAt` nulo ou com mais de 21 dias são rejeitadas antes do INSERT.

### Diagnostico

- O fallback de assumir `published_at = NOW()` quando a data era nula estava criando "zumbis":
  vagas de 2023/2024 entravam no painel como se fossem de hoje.
- O script de limpeza encontrou 231 vagas fantasma e executou um `HARD DELETE` (apagou do banco
  fisicamente), mantendo a base limpa e confiável.

## [2026-10-17 — Solides: portal central e filtro de isDisabled]

### Fixed

- `backend/src/collectors/solides.ts` — URLs da Solides agora apontam para o portal central
  (`vagas.solides.com.br/vaga/<id>`) quando o ID é numérico. A API da Solides passou a devolver
  links para subdomínios desativados (`<empresa>.solides.jobs`), causando erro de DNS (NXDOMAIN)
  no botão "Abrir vaga" do painel.
- `backend/src/collectors/solides.ts` — vagas com `isDisabled: true` retornadas pela API são
  ignoradas no coletor.

### Diagnostico

- Testes em 15-17/10 confirmaram que 100% dos IDs numéricos do banco (75) resolvem no portal
  central, enquanto IDs alfanuméricos (11) não têm portal válido (subdomínios NXDOMAIN).
- 74 URLs numéricas foram corrigidas retroativamente no banco (Neon) e 11 alfanuméricas
  marcadas como `unavailable_at` e descartadas no painel.

## [2026-10-14 — Brave: remove freshness=pm (LinkedIn/Indeed parados desde 31/08)]

### Fixed

- `backend/src/discovery/brave-search.ts` — removido `url.searchParams.set("freshness", "pm")`.
  A API do Brave passou a responder `bad_results: true` (corpo `mixed` vazio, sem `web.results`)
  para qualquer query que combine `site:linkedin.com/jobs/view`, `site:br.indeed.com/viewjob`
  ou `site:myworkdayjobs.com` com `freshness=pm`. Sem o parametro, a mesma query devolve
  13-20 resultados. A UI (search.brave.com) nao e afetada — e comportamento API-only.

### Diagnostico

- Comprovado com 6 chamadas diretas a API Brave em 13-14/10. Cache `controle_busca_web`
  mostra ultima resposta >0 de LinkedIn/Indeed em 31/08 13:42 UTC. 43 dias zerados.
- `country=BR`, `result_filter=web` e o operador `site:` nao sao o gatilho. `freshness=pm` e.
- Impacto antes do fix: ~6 consultas/dia x 43 dias = ~258 chamadas Brave consumidas sem retorno.
  O cache gravava `paginas: []` e marcava como "consultado hoje", impedindo retentativa.

### Notes

- Consultas web nao instrumentam `funil_telemetria` (debito D7). Verificacao pos-fix e via
  `controle_busca_web.updated_at` ou SQL direto em `jobs.source`.
- Cache com 232 consultas antigas sofrera rollover natural em 24h (registroFoiConsultadoHoje).
- 276/276 backend verdes. typecheck + build zerados.

## [2026-10-13 — Falsos positivos geograficos + Solides + termos Gupy]

### Fixed

- `backend/src/services/elegibilidade-localizacao.ts` — `bandeirasEstrangeirasRemoto` nao incluia variantes de Reino Unido (`uk`, `gb`, `great britain`, `england`, `scotland`, `wales`, `u.k.`). Vaga `"Remote (UK)"` passava como indefinida. Adicionadas.
- Mesma funcao — fallback textual quando `location=null`: usa `localizacaoTemUfBrasileira` sobre o texto cru e `contemAlgumTermo(["brasil","brazil"])` sobre texto normalizado. NAO usa `localizacoesBrasil` (contem "para" — estado Para — que casaria em frase generica). Roda depois de `exclusoesBrasil` e `descricaoRestringeParaOutroPais`, para nao liberar vaga proibida no Brasil.
- `backend/src/collectors/solides.ts` — `publishedAt: null`. A API da Solides so expoe `createdAt` (data de cadastro no sistema), sem data de publicacao real. Usar `createdAt` como proxy causava 107 de 135 vagas em `foraDaJanela` (79%).
- `backend/src/config/search-queries.ts` — `gerarTermosBuscaNativaGupy` prefixa o titulo principal de cada familia ativa antes dos cargos do usuario. Antes, os 45 `cargosPrincipais` (dominados por "support") consumiam os 30 slots, e familias como `dados`/`processos`/`implantacao` nunca entravam nos termos de busca do Glassdoor/Brave.

### Added

- 6 testes em `tests/elegibilidade-m11.test.ts` cobrindo: `"Remote (UK)"` e `"Remote (GB)"` bloqueiam; `location=null` + `"Brasilia, DF, BR"` na descricao e compativel; `location=null` + `"Not available in Brazil"` continua incompativel; `location=null` sem sinal BR continua indefinida; `"para"` sozinho em descricao nao e confundido com o estado Para.

### Notes

- **Auditoria Brave/LinkedIn (read-only, concluida):** frontend (`controle-sincronizacao.tsx`) tem 2 botoes — verde "Sincronizar sem Brave" (chama `executarSincronizacao(false)`) e indigo "Buscar novas vagas na web" (abre modal → `executarSincronizacao(true)`). Cadeia completa ate `BRAVE_SEARCH_API_KEY` no Render. LinkedIn/Glassdoor parados desde 25/08/2026 no banco. **Pendente:** confirmar qual botao e usado em producao e inspecionar tabela de controle de cache.
- **Auditoria de falso-positivo geografico:** `6078` (Arbeitnow, `location="Remote (UK)"`) e `6142/6145/6146` (oportunidadesdf, `location=null`) passaram por `indefinida` no filtro. Ambas as rotas fechadas pelos fixes acima.
- **Solides:** coletor entrega 135 vagas; 107 caiam em `foraDaJanela` por `createdAt` nao ser data de publicacao. Apos o fix, todas passam para o matcher. Vagas existentes com `published_at` derivado de `createdAt` continuam com o valor antigo no banco (fix so afeta coletas novas).
- 276/276 backend verdes. typecheck + build zerados.

## [2026-10-13 — Saneamento on-site + Opção 2 reordenada]

### Fixed

- `backend/src/services/elegibilidade-localizacao.ts` — a Opção 2 (`localizacoesAceitas`) era avaliada ANTES de `modalidadeEfetiva`. Isso fazia com que `localizacoesAceitas=["brasil"]` liberasse vagas presenciais fora da RMPJP. Bug descoberto ao investigar "vagas presenciais" que apareciam no painel. Agora `modalidadeEfetiva` roda primeiro; a Opção 2 só libera quando `modalidade !== "on-site"`.
- Mesma função — troca `alvo.includes(termo)` por `contemTermo` (word boundary). `"Brasília, Distrito Federal"` não casa mais com `"brasil"` como substring.
- Guard adicional: termos GENÉRICOS em `localizacoesAceitas` (`brasil`, `brazil`, `worldwide`, `global`, `latam`, `americas`, etc.) não liberam vagas `on-site`. Apenas cidades específicas continuam liberando.

### Added

- `backend/scripts/saneamento-onsite.ts` — reavalia `job_matches` `relevant` com `workplace_type IN ('on-site','presencial','onsite')`. Move para `discarded` os que a função atual considera incompatíveis. Suporta `APPLY=1` e `REVERT=1 BACKUP=<path>`.
- 4 testes em `tests/elegibilidade-m11.test.ts`; 1 teste reescrito + 1 novo em `tests/job-matcher.test.ts`.

### Applied

- Saneamento on-site no Neon: **43 registros** `relevant` → `discarded` (São Paulo, Rio, Brasília, Curitiba, Fortaleza, Florianópolis, Barueri, etc.). Permanecem `relevant` apenas `6475` e `8806` (ambas João Pessoa/RMPJP). Backup: `backend/scripts/.backups/saneamento-onsite-2026-10-13T16-32-28.json`.

### Notes

- 270/270 backend verdes. typecheck + build zerados.

## [2026-10-13 — Resync cirúrgico: recuperação de Curitiba]

### Added

- `backend/scripts/resync-recuperacao.ts` — reanálise de `job_matches` em `discarded` com `avaliarElegibilidadeBrasil` + `matchJob` atuais. Baldes: A (geo OK + titulo OK + score >= 60, recuperar), B (score abaixo do corte), C (geo incompativel), D (titulo excluido). Suporta `ONLY_IDS=1,2,3` (aplicar apenas subconjunto) e `REVERT=1 BACKUP=<path>` (desfazer). Dry-run por padrao; `APPLY=1` grava backup em `scripts/.backups/`.

### Applied

- Recuperadas via `ONLY_IDS=6530,6716 APPLY=1`: `INSIDE SALES SUPPORT ANALYST` (Curitiba/PR, hybrid, score 69) e `SERVICE DESK ANALYST II` (Curitiba/PR, hybrid, score 100). Backup: `backend/scripts/.backups/resync-recuperacao-2026-10-13T13-27-29.json`.
- 4 candidatos `Technical Support Engineer * US Weekends` (`match_id` 1683, 1684, 1686, 1689) mantidos em `discarded` por decisao explicita (foco EUA).

### Notes

- Os 227 IDs do saneamento de 08/10 foram checados separadamente: 1 recuperavel, 224 ainda incompativeis (presencial fora da RMPJP — corretamente descartados).
- Balde C (70 vagas) — Peru, Mexico, EUA, Worldwide — trava geografica confirmada atuando corretamente.

## [2026-10-13 — Fix: falso positivo em descricaoRestringeParaOutroPais]

### Fixed

- `backend/src/services/elegibilidade-localizacao.ts` — `descricaoRestringeParaOutroPais` exigia apenas co-existencia (em qualquer parte da descricao) de um indicador de restricao e uma bandeira estrangeira. Isso descartava vagas hybrid/presencial no Brasil de multinacionais americanas ("U.S.-based company" + "Must reside in Curitiba"). Passa a exigir co-ocorrencia na mesma janela de ate 100 chars (mesma frase, sem `.` `!` `?` ou quebra de linha no meio).
- Casos reproduzidos e corrigidos: vagas `3514` (INSIDE SALES SUPPORT ANALYST) e `3523` (SERVICE DESK ANALYST II), ambas `hybrid` em Curitiba/PR, source `gupy`.

### Notes

- Validacao empirica: Curitiba hybrid -> compativel; "must be based in Serbia" -> incompativel; "must reside in Portugal" -> incompativel.
- 265/265 backend verdes. typecheck + build zerados.
- Vagas existentes com status `discarded` por esse motivo NAO sao reavaliadas automaticamente — precisam de re-analise.

## [2026-10-13 — Correção de duplicação no CHANGELOG]

### Fixed

- Bloco `[2026-10-08 — LinkedIn + inferência de modalidade + 7 boards ATS] — expansão de fontes` aparecia duplicado byte-a-byte em duas seções consecutivas. Segunda cópia removida. Detectado durante a auditoria read-only de 12–13/10.

## [2026-10-12 — Auditoria read-only de 3 anomalias]

### Investigado

- **Queda 23→256 incompatíveis da Gupy** entre `2dd8743c` (23:58:09Z de 08/10) e `79d97668` (00:13:04Z de 09/10).
  - Replay offline dos commits `b9bd095`, `d0e4166`, `baa8810` sobre as mesmas 898 linhas de `jobs` — resultado byte-a-byte idêntico (`incompat=257, inferida=4, compativel=612, indefinida=29, matchAderente=599`). **Código exonerado.**
  - Auto-Deploy = Yes no Render; trava v3 ativa nos 3 syncs. **Deploy exonerado.**
  - `updated_at` do perfil anterior aos dois syncs; `obterPerfilProfissional` sem cache. **Perfil exonerado.**
  - Hipótese em aberto: `F1` (input da API da Gupy mudou) ou falso positivo de `descricaoRestringeParaOutroPais`.

- **Vagas obsoletas ativas:** 505 vagas da Gupy + 11 de outras fontes com `published_at > 21 dias` e `unavailable_at IS NULL`. `reconcileCompleteSourceAvailability` só roda para ATS, nunca para coletores diretos. Registrado como débito D2.

- **Anomalia `last_seen_at` 2 vs 277** entre os dois syncs. Investigado e descartado como bug — é sobrescrita normal entre syncs.

### Added

- `backend/tests/fila-ats.test.ts` — testes da fila com backoff temporal e classificação de erro permanente/transitória.
- `database/migrations/017_add_fontes_ats_desativacao.sql` — colunas `desativada_em`, `motivo_desativacao` e índice `(ativa, falhas_consecutivas)` em `fontes_ats`.

### Changed

- `backend/src/collectors/ats.ts` — `ErroColetaAts` tipado; `statusEhPermanente()` reconhece 404/410.
- `backend/src/services/fontes-ats.ts` — classifica falha em permanente/transitória.
- `backend/src/repositories/fonte-ats-repository.ts` — `ORDER BY` por `falhas_consecutivas` + backoff temporal; auto-desativa após 5 falhas permanentes.
- `backend/src/collectors/gupy.ts`, `solides.ts`, `vagas-com.ts`, `geekhunter.ts`, `getonboard.ts`, `remotive.ts`, `remote-ok.ts`, `jobicy.ts`, `arbeitnow.ts` — nenhuma mudança (histórico).

### Notes

- 265/265 testes backend verdes. typecheck + build zerados.
- Auditoria em andamento — nada foi implementado nesta fase.

## [2026-10-08 — LinkedIn + inferência de modalidade + 7 boards ATS] — expansão de fontes

### Added

- `backend/src/extractors/linkedin.ts` — extractor estático do LinkedIn público. Sem login, sem cookies, sem Playwright. Fonte primária JSON-LD (quando disponível); fallback HTML público (`h1.topcard__title`, `.topcard__org-name-link`, `.topcard__flavor--bullet`, `.description__text`).
- `backend/tests/extractor-linkedin.test.ts` — 9 cenários: JSON-LD válido, HTML topcard, remoto detectado, HTML incompleto, sem título, vazio, JSON-LD inválido, JSON-LD não-JobPosting, urlCandidatura fallback.
- `backend/scripts/descobrir-fontes-ats.ts` — testa combinações (empresa × ATS) contra APIs públicas e reporta candidatos. Dry-run por padrão.
- `backend/scripts/verificar-candidatos-ats.ts` — verificação profunda: parseia JSON, conta vagas com título real, amostra 3 títulos. Elimina falsos positivos de homônimos estrangeiros.
- `backend/scripts/aplicar-fontes-confirmadas.cjs` — insere as fontes verificadas em `fontes_ats` com backup JSONB.

### Changed

- `page-inspector.ts` — chama `extrairVagaLinkedin` antes do fallback JSON-LD genérico quando o provedor é LinkedIn. Fecha o buraco que descartava vagas do LinkedIn silenciosamente.
- `conversao-vaga-web.ts` — `workplaceType` passa a ser inferido por texto quando `remoto = false`: `hybrid` se título/descrição mencionam, `on-site` se mencionam presencial, `unknown` caso contrário. Antes, tudo virava `unknown`.

### Aplicado

- **7 boards ATS novos em `fontes_ats`**, todos verificados com vagas reais:
  - `greenhouse:stone` — 368 vagas
  - `greenhouse:btgpactual` — 281 vagas
  - `greenhouse:inter` — 164 vagas
  - `greenhouse:c6bank` — 161 vagas
  - `inhire:cielo` — 22 vagas
  - `inhire:xp` — 19 vagas
  - `inhire:sicredi` — 4 vagas
  - **Total bruto: ~1019 vagas** que passam a ser coletadas no próximo sync.
  - Backup: `backend/scripts/.backups/fontes-ats-aplicadas-2026-10-08T14-24-30.json`.

- **5 boards descartados por homonímia estrangeira** (falso positivo do teste inicial):
  - `inhire:bradesco` — board de teste ("ANALISTA TESTE INGRID")
  - `recruitee:accenture` — sample do Recruitee (títulos "Sample")
  - `recruitee:matera` — Matera francesa de gestão de condomínios
  - `recruitee:dock` — Dock holandesa de assistência social
  - `ashby:neon` — Neon americana (dados para museus), não a fintech brasileira

### Notes

- 260/260 testes backend verdes, `tsc` limpo, build limpo.
- Lição: para ATS que hospedam múltiplas empresas no mesmo domínio (`recruitee`, `workable`), o slug livre tem colisão alta com empresas estrangeiras homônimas. Curadoria manual por verificação profunda é obrigatória.


## [2026-10-08 — Trava geográfica v3 + saneamento] — diretiva v2

### Added

- `RELATORIO_FASE02.md` — inventário dos 9 coletores + panorama dos 6 ATS, com três colunas de sucesso por fonte, breakdown de descartes por chave e amostra de sobreviventes.
- `fase02-gerar-relatorio.cjs` — gerador read-only do relatório anterior.
- `backend/scripts/saneamento-dryrun.ts` e `backend/scripts/saneamento-apply.ts` — reprocessam a base sob a trava nova. Dry-run por padrão, apply com `APPLY=1`, backup JSONB dos IDs em `backend/scripts/.backups/`.
- `backend/scripts/saneamento-reverter.cjs` — reverte o apply a partir do backup.
- `backend/tests/trava-geografica.test.ts` — matriz de 4 pontos da diretiva + cenários mínimos (ajuste 6) + Opção 2 (bandeira estrangeira vence `localizacoesAceitas`).
- Teste `fail-fast: vaga geo-bloqueada retorna score 0 sem chegar ao matcher` em `job-matcher.test.ts`.
- Contador `localizacaoInferida` no diagnóstico do funil.

### Changed

- `elegibilidade-localizacao.ts` — reescrito com a matriz estrita:
  - Regra 1 (presencial): só RMPJP (João Pessoa + região metropolitana oficial). Removidos `paraiba` e `pb` sozinhos para que Campina Grande e Patos sejam bloqueados.
  - Regra 2 (híbrido): qualquer ponto do Brasil.
  - Regra 3 (remoto): só com menção explícita ao Brasil. `Worldwide`, `Global`, `LATAM`, `EMEA`, `Anywhere` deixam de ser passe livre.
  - Regra 4 (unknown): fallback conservador.
  - Opção 2: bandeira estrangeira vence `localizacoesAceitas` — um perfil com `"global"` não libera mais `"Serbia | Global"`.
  - Heurística `cidade brasileira específica → on-site` corrigida: UF brasileira marca localização física mesmo quando a cidade é também o nome do estado.
- `modalidade-vaga.ts` — `interpretarModalidadeEstruturada` cobre `remote_local` e `remote_global` (emitidos por GetOnBoard).
- `collectors/ats.ts` — os 5 coletores com campo estruturado (Lever, Workable, Ashby, Recruitee, InHire) passam a usar `interpretarModalidadeEstruturada`. Antes, `hybrid` e `on-site` colapsavam em `unknown`.
- `filtragem-vagas.ts` — diagnóstico separa `localizacaoIncompativel` de `localizacaoInferida`.
- `job-matcher.ts` — fail-fast confirmado: score 0 antes de qualquer pontuação em vaga geo-bloqueada.

### Aplicado

- Saneamento no Neon: **227 registros** passaram de `relevant` para `discarded` (968 → 741 relevant+new).
  - `gupy` 214 (27,0%), `jobicy` 3 (75,0%), `agregador` 2, `greenhouse` 2, `desconhecido` 2, `indeed` 1, `lever` 1, `infojobs` 1, `remotive` 1.
  - Backup de IDs: `backend/scripts/.backups/saneamento-2026-10-08T13-40-48.json` (reversível via `saneamento-reverter.cjs`).
  - Vagas vistas (`viewed_at IS NOT NULL`) e aplicadas **não** foram tocadas.

### Notes

- 251/251 testes backend verdes, `tsc` limpo, build limpo (era 230 antes).
- Docs `HANDOFF.md` e `README_ATUAL.md` atualizados.
- `PLANO_EXPANSAO.md` criado (LinkedIn via Brave dork, sites próprios piloto 30–50 empresas, sem LLM no pipeline, sem burlar bloqueio).


Consolidado a partir do histórico de commits de `main` e das mudanças da sessão de outubro/2026.

## [2026-10-07 — Fase 0.1] — baseline e inventário

### Added

- `RELATORIO_FASE0.md` com leitura direta do Neon: telemetria da última sync por fonte, totais por status, distribuição de score em baldes, comportamento real das chaves de `descartes` e amostra de vagas 40–59.

### Notes

- Sem mudança de comportamento. Apenas leitura.
- 1197 vagas no banco (936 novas, 15 vistas, 36 aplicadas, 19 ignoradas).
- Gupy responde por 483 coletadas / 229 aderentes. ATS de lever (thinkahead, filevine) caem 100% por localização.
- Baldes 1–39, 40–49 e 50–59 praticamente vazios no banco.
- `matcherAbaixoDoMinimo` = `scoreZero` em todos os casos hoje.

## [2026-10-07 — Auditoria knip] — limpeza de código morto e artefatos

### Removed

- 2 funções mortas no backend (`listUnmatchedJobs`, `registrarFontesAtsDosJobsExistentes`).
- 34 exports decorativos (20 no backend, 14 no frontend).
- `backend/src/services/analisador-curriculo.ts` (re-export intermediário).
- `apps/` vazio e `backups/job-search-local.backup` (dump PostgreSQL antigo).
- 10 arquivos `.bak` de sessões anteriores.

### Changed

- Import de `analisarCurriculo` em `routes/perfil.ts` e em `tests/analisador-curriculo.test.ts` aponta direto para `services/curriculo/analisador-curriculo.js`.

### Added

- Script `audit` (`knip`) no `package.json` da raiz.
- `PROTOCOLO.md` consolidando o padrão de trabalho.

### Notes

- 207/207 backend + 54/54 frontend + typecheck + lint + build zerados.

## [2026-10-07 — Fase 1B-Frontend] — painel de telemetria + testes

### Added

- Painel retratil `Telemetria` no dashboard, fechado por padrao, com botoes `[7d | 14d | 30d]` e `Atualizar`.
- Funil da ultima execucao (6 contadores), serie diaria em barras Tailwind e top motivos de descarte em barras horizontais.
- Rota-proxy `GET /api/telemetria/resumo` com sanitizacao de `?dias` (default 7, range 1..30) e propagacao de status do backend.
- Utilitarios puros em `src/lib/telemetria-utils.ts`.
- Suite Vitest + React Testing Library: 54 testes cobrindo utilitarios (28), rota-proxy (12), componente de telemetria (10) e integracao no painel (4).
- Configs `vitest.config.mts`, `vitest.setup.ts`, `vitest.server-only-stub.ts`.

### Changed

- `src/app/page.tsx` carrega `obterResumoTelemetria(7)` em paralelo com `obterDadosPainel()`; falha da telemetria nao derruba a pagina.
- `src/components/painel/painel-vagas.tsx` recebe `resumoTelemetriaInicial` e monta `<Telemetria>` abaixo de `<ControleSincronizacao>`.
- `src/lib/api-servidor.ts` ganha `obterResumoTelemetria(dias)`.
- `package.json`: scripts `test`, `test:watch`, `test:ui`; novas dev-deps de teste (`vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@vitejs/plugin-react`); `@types/node` de `^20` para `^24` (runtime e Node 24.13.1).

## [2026-10-07 — Fase 1B-Backend] — resumo agregado da telemetria

### Added

- Endpoint `GET /jobs/telemetria/resumo` com parâmetro opcional `?dias` (default 7, range 1..30).
- Função `resumirTelemetria(dias)` no repositório de telemetria.
- Função pura `agregarLinhas(rows)` — agregação em JS sobre as linhas cruas da última execução.
- Migration `016_add_idx_funil_telemetria_created_at.sql` (`CREATE INDEX IF NOT EXISTS` em `funil_telemetria (created_at DESC)`).
- Testes unitários em `backend/tests/funil-telemetria-resumo.test.ts` (agregação, sanitização de `dias`, handler com mocks de req/res).

### Notes

- O payload é plano; as faixas de score (`scoreZero`, `score1a39`, `score40a49`, `score50a59`) são sub-buckets de `matcherAbaixoDoMinimo` — a soma de `topDescartes` não é uma partição de `coletadas`.
- Sem join com `job_matches`: `importadas` representa o topo do funil operacional da execução.

## [2026-10-07 — Fase 1A] — vocabulário das 7 famílias

### Added

- Vocabulário de `search-queries.ts` expandido nas 6 famílias específicas (`suporte`, `sistemas`, `infraestrutura`, `implantacao`, `processos`, `dados`) com sinônimos PT/EN, variações N1/N2/N3 e níveis Sênior/Pleno/Júnior.
- Constante `LIMITE_RELACIONADOS_POR_FAMILIA_GUPY = 5`, aplicada em `gerarTermosBuscaNativaGupy`.

### Changed

- `PALAVRAS_FAMILIA` ampliado com termos adicionais (ex.: `sysadmin`, `virtualization`, `rollout`, `analytics`, `tableau`, `looker`, `information security`).
- `gerarTermosBuscaNativaGupy` passa a limitar os títulos relacionados a 5 por família antes do `slice(0, 30)`, garantindo que todas as famílias ativas do perfil apareçam.

## [2026-10-07] — veto geográfico e re-análise

### Fixed

- `politica-vagas-brasil`: inferência de modalidade por localização quando a fonte não informa. Presencial fora de João Pessoa/PB é vetado.
- Bug onde qualquer localização contendo "Brasil" era tratada como genérica e pulava o veto.
- Adicionadas variações de EUA em `localizacoesEstrangeiras`.

## [2026-10-06] — sessão de correção

### Added

- Coluna `workplace_type` em `jobs` (015).
- Coluna `content_hash` em `jobs` (013).
- Tabela `funil_telemetria` (012).
- Colunas `ultimos_aderentes` e `coletas_sem_aderentes` em `fontes_ats` (014).
- Endpoint `GET /jobs/telemetria`.
- Repositório `funil-telemetria-repository.ts`.

### Changed

- Gupy migrada para `portal.gupy.io/api/job-search/jobs`.
- Sólides reescrita sobre `apigw.solides.com.br/jobs/v3/portal-vacancies`.
- `MATCHER_VERSION` para 3.
- `MIN_SCORE_RELEVANT` centralizado.
- Coletores passam `perfil` para filtrar termos (GeekHunter, Remotive, Remote OK, Arbeitnow).
- `titulosExcluidos` expandido: estágio, aprendiz, C-level.

### Removed

- Endpoints antigos de Gupy e Sólides.

## [2026-09-03]

### Fixed

- Melhorada a elegibilidade de vagas remotas globais.

## [2026-09-01]

### Changed

- Melhorada a coleta e o diagnóstico das fontes ATS.

## [2026-08-31]

### Fixed

- Corrigida a contabilização de novas oportunidades.

### Changed

- Evitadas buscas redundantes do Vagas.com no Brave.

## [2026-08-26]

### Added

- Diagnóstico não invasivo do funil.
- Novas fontes gratuitas.
- Diferenciação entre data publicada e data encontrada.
- Ciclo de vida e validade das vagas.

### Changed

- Padronizadas buscas em português.
- Ampliada coleta.

### Fixed

- Restaurada a filtragem original.

## [2026-08-25]

### Added

- Versionamento da análise do matcher.
- Atualização de vagas existentes antes da reanálise.
- Separação entre visualização e status.

### Fixed

- Corrigida queda por erro de pool do PostgreSQL.

## [2026-08-19]

### Added

- Coletor nativo da Sólides.
- Coleta nativa da Gupy.

### Fixed

- Corrigido falso positivo de UF brasileira em localização estrangeira.

## [2026-08-18]

### Added

- Regras de restrição ao território brasileiro.
- Sincronização assíncrona e resiliente.
- Controle de busca web persistido no PostgreSQL.

## [2026-08-17]

### Added

- Coleta direta e aprendizado de ATS.
- Perfil profissional editável e persistente.
- Importação de currículo.

## [2026-08-14]

### Added

- Importação e análise de currículos.
- Matching baseado no perfil completo.

## [2026-08-12]

### Added

- Dashboard web.
- Persistência e acompanhamento de oportunidades.
- Cache e ranking local da descoberta.

## [2026-08-11]

### Added

- Descoberta de vagas pela web.
- Inspeção e extração de vagas da Gupy.
- Elegibilidade de vagas para o Brasil.

### Changed

- Estruturada a sincronização para múltiplas fontes.

## [2026-08-11 — início do projeto]

### Added

- Estrutura inicial do backend.
- Fluxo inicial de vagas.
