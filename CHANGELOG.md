# Changelog

Consolidado a partir do histórico de commits de main e das mudanças feitas fora do Git durante a sessão de outubro/2026.

## [2026-10-06] — Correção dos coletores Gupy e Sólides

### Fixed

- Gupy: endpoint migrado de `employability-portal.gupy.io/api/v1/jobs` para `portal.gupy.io/api/job-search/jobs`.
- Sólides: coletor reescrito sobre o endpoint público `apigw.solides.com.br/jobs/v3/portal-vacancies`. A vaga completa vem na listagem e a etapa de abrir cada detalhe foi eliminada.
- Migrations 007 a 011 aplicadas no banco local. A ausência da 007 (`estado_sincronizacao`) era a causa do erro em `POST /jobs/sync`.

### Resultado

- Sincronização de referência: Gupy coletou 488 e importou 231; Sólides coletou 142 e importou 20.

---

## [2026-10-06] — sessão de outubro

### Added

- MIN_SCORE_RELEVANT = 60 em config/matcher.ts (M9).
- PENALIDADE_TITULO_FORA_FOCO = 15 em config/matcher.ts (M4).
- content-hash.ts com calcularContentHash (C11).
- Coluna jobs.content_hash e índice (013).
- Tabela funil_telemetria com índices (012).
- Repositório funil-telemetria-repository.ts (M1).
- Endpoint GET /jobs/telemetria (M1).
- Teste backend/tests/elegibilidade-m11.test.ts com 6 casos (M11).

### Changed

- MATCHER_VERSION passou de 2 para 3.
- gerarTermosBuscaNativaGupy e gerarTermosBuscaNativaSolides incluem cargos do perfil, inclusive em inglês (M2).
- refreshExistingJobs compara content_hash (C11).
- createJob grava content_hash (C11).
- syncJobs aceita execucaoId opcional (M1).
- job-matcher.ts, job-analysis.ts, filtragem-vagas.ts, processamento-vagas-web.ts passam perfil.localizacoesAceitas (M11).

### Fixed

- Trava geográfica de João Pessoa/PB removida (M3).
- Título fora do foco em português desconta 15 pontos em vez de vetar (M4).
- 13 testes que defendiam comportamento antigo reescritos.

### Removed

- Balde naoRemotaForaJoaoPessoa do DiagnosticoFunilVagas.

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
- Ajustada conexão e filtragem.

### Fixed

- Restaurada a filtragem original.

## [2026-08-25]

### Added

- Versionamento da análise do matcher.
- Atualização de vagas existentes antes da reanálise.
- Separação entre visualização e status.

### Changed

- Reduzida a carga e o reprocessamento.
- Estabilizada a sincronização em produção.

### Fixed

- Corrigida queda por erro de pool do PostgreSQL.
- Corrigida modalidade de vagas.
- Ajustado filtro de oportunidades locais.

## [2026-08-20]

### Fixed

- Reduzido descarte prematuro por localização.

## [2026-08-19]

### Added

- Coletor nativo da Sólides.
- Coleta nativa da Gupy.
- Ampliação dos portais complementares.
- Descoberta via Remote Rocketship.

### Fixed

- Histórico de vagas exibido corretamente.
- Buscas brasileiras com prioridade por família.
- Listagens do Remote Rocketship ignoradas quando não representavam vagas individuais.
- Corrigido falso positivo de UF brasileira em localização estrangeira.

## [2026-08-18]

### Added

- Regras de restrição ao território brasileiro.
- Normalização de identificadores ATS.
- Sincronização assíncrona e resiliente.
- Proteção de acesso e preparação para publicação.
- Controle de busca web persistido no PostgreSQL.

## [2026-08-17]

### Added

- Coleta direta e aprendizado de ATS.
- Perfil profissional editável e persistente.
- Importação de currículo.

### Changed

- Perfil padrão consolidado.
- Configurações e scripts redundantes removidos.
- Analisador de currículo modularizado.

## [2026-08-14]

### Added

- Importação e análise de currículos.
- Matching baseado no perfil completo.
- Perfil profissional persistente.

## [2026-08-12]

### Added

- Dashboard web para acompanhamento de vagas.
- Persistência e acompanhamento de oportunidades.
- Cache e ranking local da descoberta.
- Sincronização segura e controle de consumo Brave.

## [2026-08-11]

### Added

- Descoberta de vagas pela web.
- Inspeção e extração de vagas da Gupy.
- Elegibilidade de vagas para o Brasil.
- Suporte a Workable e SmartRecruiters.
- Integração de vagas web ao PostgreSQL e matcher.

### Changed

- Sincronização para múltiplas fontes.
- Camada de descoberta em português.

## [2026-08-11 — início do projeto]

### Added

- Estrutura inicial do backend.
- Fluxo inicial de vagas.
