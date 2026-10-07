# Changelog

Consolidado a partir do histórico de commits de `main` e das mudanças da sessão de outubro/2026.

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
