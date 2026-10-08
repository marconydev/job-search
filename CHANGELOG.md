# Changelog

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
