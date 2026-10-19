
## Sessão 19/10/2026 — Sprint 1 & 2 (Sanidade e Match)

- **Hack Removido:** `job-analysis.ts` voltou a respeitar a Regra de Ouro Geográfica (presenciais fora da RMPJP são descartados).
- **Bloqueio de Desvio:** `job-matcher.ts` bloqueia cargos como Desenvolvedor, Fullstack, Delphi, C# com Score 0.
- **Saneamento:** O banco foi expurgado de links de listagem (InfoJobs, BNE) e subdomínios mortos (Sólides/Ashby). 24 vagas de Dev foram descartadas.
- **Estado do Painel:** O Top 10 de vagas relevantes agora é 100% aderente (Suporte/Infra/Remoto).

### Pendências Técnicas (Sprint 3):
- **Rotação de Termos:** Implementar offset no banco para varrer todos os cargos do perfil (Suporte, Infra, Sistemas) sem estourar o limite diário.
- **Gupy:** Ajustar o parser para aceitar vagas antigas que ainda estão "published".
- **LinkedIn/Glassdoor:** Refinar dorks do Brave.



## Sessão 19/10/2026 — Sprint 1, 2 e 3

- **Hack Removido:** `job-analysis.ts` respeita 100% a localização (RMPJP).
- **Bloqueio de Desvio:** `job-matcher.ts` zera Score de cargos de Dev.
- **Saneamento:** Banco limpo de links mortos, Devs e presenciais fora da RMPJP.
- **Rotação:** Todos os coletores diretos (Gupy, Sólides, Vagas, etc.) agora recebem um offset salvo no banco para buscar termos diferentes a cada sync.
- **Cache Tolerante:** `controle-busca-web-repository.ts` não descarta o cache inteiro se uma consulta falhar.

### Pendências:
- Validar LinkedIn via Brave (rodar sync com Brave ativado).
- Confirmar avanço dos offsets no banco.


# README_ATUAL — Job Search

Snapshot do estado da aplicação após a sessão de 20/10/2026.

## Funcionalidades ativas

- Endpoint `/health` público para liveness probe do Render.
- Endpoint `/health/database` protegido para readiness probe.

- 9 coletores diretos: Gupy, Sólides, Vagas.com, GeekHunter, GetOnBoard, Remotive, Remote OK, Jobicy, Arbeitnow.
- Coleta de 6 ATS: Greenhouse, Lever, Workable, Ashby, Recruitee, InHire — com modalidade estruturada preservada.
- Descoberta web complementar via Brave Search (orçamento controlado).
- Cache de buscas web em PostgreSQL com TTL de 7 dias.
- Trava geográfica v3: presencial só RMPJP; híbrido em todo o Brasil; remoto só com menção explícita ao Brasil.
- Opção 2: bandeira estrangeira vence `localizacoesAceitas` do perfil.
- Matching determinístico local, score 0–100, corte 60.
- Perfil profissional singleton em JSONB, lido a cada sync.
- Importação de currículo PDF, DOCX e TXT.
- Sincronização assíncrona com trava, heartbeat e detecção de interrupção.
- Telemetria de funil por execução/fonte em `funil_telemetria`.
- Fila de ATS com backoff temporal + classificação permanente/transitória de falha.
- Auto-desativação de ATS após 5 falhas permanentes consecutivas.
- Extractor LinkedIn (JSON-LD + fallback HTML topcard, sem login).
- Saneamento on-site (`backend/scripts/saneamento-onsite.ts`): move para discarded vagas relevant com `workplace_type` presencial que violam a RMPJP estrita.
- Fallback textual geografico: quando `location=null`, checa descricao/titulo por UF brasileira ou `brasil`/`brazil`.
- Scripts de saneamento da base (dry-run + apply + reverter).

## Sessão de outubro/2026 — o que mudou

### Sessão 07–08/10

- Fase 0.2 — inventário dos 9 coletores em `RELATORIO_FASE02.md`.
- Trava geográfica v3 — matriz estrita de 4 pontos.
- Opção 2 — bandeira estrangeira vence `localizacoesAceitas`.
- ATS Lever/Workable/Ashby/Recruitee/InHire usando `interpretarModalidadeEstruturada`.
- Fail-fast confirmado (score 0 antes de qualquer pontuação em vaga geo-bloqueada).
- Saneamento aplicado: 227 vagas `relevant` → `discarded`. Backup reversível.
- Extractor LinkedIn + 9 testes.
- 7 boards ATS adicionados (Stone, BTG, Inter, C6, Cielo, XP, Sicredi).
- Fila de ATS com backoff temporal + auto-desativação após 5 falhas permanentes.

### Sessão 18/10 (Expansão de Cobertura)
- Gupy: subdomínios `*.gupy.io` mapeados como ATS.
- Sólides: paralelizada e sem descarte fantasma por falta de data.
- Elegibilidade: fallback geográfico para portais nacionais.

### Sessão 18/10 (Final)

- Anomalia 3.1 (Gupy) resolvida. Não era bug: a Gupy retornou vagas presenciais
  de outros estados e a Trava v3 agiu corretamente.
- O projeto está com a Fase 1, LinkedIn, ATS e anomalias finalizados.

### Sessão 18/10 (LinkedIn)

- Extrator adaptado para o novo frontend React (JSON-LD ausente, classes ofuscadas).
- Extração de data de publicação pelo texto relativo ("há X semanas").
- Fallback de localização por regex.

### Sessão 18/10 (pós)

- ATS: `coletarFontesAtsAprendidas` paralelizada com `executarComPool(fontes, 4, fn)`.
- Telemetria ATS passa a preencher `duracao_ms` (era NULL); `job-sync.ts:181` já estava ok.
- Race em `falhas_consecutivas` era fantasma; UPDATE é atômico por linha.
- Suíte: 295/295.

### Sessão 18/10
- Fix PingWind: vaga US-federal remota (`location="Remote"`, `remote=true`)
  passava pela trava v3 como `indefinida`. Adicionada função
  `descricaoIndicaRestricaoFederalEstrangeira` que bloqueia vagas cuja descrição cita
  programa federal ou agência governamental estrangeira.
- Fix anterior (`Remote` puro → `incompativel`) revertido — quebrava vaga em
  português legítima (`job-matcher.test.ts:162`).
- 5 novos testes em `backend/tests/pingwind-regression.test.ts`. Suíte: 283/283.

### Sessão 20/10
- Fix Vagas.com: bloqueio de URLs `/vagas-de-...` (páginas de busca) no classifier e coletor.
- Saneamento: 10 vagas falsas removidas.

### Sessão 19/10
- Auditoria Tech Lead: índices parciais no banco para velocidade do painel.
- Fix no Brave: conversão nativa de `page_age` para data retroativa (mantém LinkedIn/Indeed).
- Expansão de queries (até 40 termos na Gupy, 8 por família).

### Sessão 18/10
- Fix Zumbis: descoberta web não persiste vagas sem data comprovada.
- Hardening de data: vaga sem `published_at` (ou > 21 dias) é barrada na ingestão.
- Saneamento de banco: Hard delete de 231 vagas mortas/zumbis.

### Sessão 17/10
- Fix Solides: URLs apontam para o portal central (`vagas.solides.com.br`). Links antigos
  (subdomínios `.solides.jobs`) estavam mortos (NXDOMAIN).
- Filtro de `isDisabled: true` no coletor da Solides.
- Saneamento no banco: 74 URLs corrigidas, 11 vagas alfanuméricas descartadas.

### Sessão 14/10

- Fix Brave: removido `freshness=pm` de `brave-search.ts`. LinkedIn/Indeed voltam a retornar
  via API (estavam zerados desde 31/08 por `bad_results: true` da API Brave).
- Diagnostico: 6 chamadas diretas a API provaram que o gatilho e o `freshness=pm`, nao a query,
  nao o `country=BR`, nao o operador `site:`.

### Sessão 13/10

- Fix `descricaoRestringeParaOutroPais` (co-ocorrência obrigatória).
- Resync cirúrgico: `resync-recuperacao.ts` + 2 Curitiba recuperadas.
- Fix Opção 2 (`localizacoesAceitas` avaliava antes da modalidade).
- Saneamento on-site: 43 vagas presencial fora RMPJP → discarded.
- Variantes UK (`uk`, `gb`, `england`...) em `bandeirasEstrangeirasRemoto`.
- Fallback textual `location=null` (Brasilia e casos similares).
- Solides: `publishedAt: null` (API so expoe `createdAt`).
- `gerarTermosBuscaNativaGupy`: principais por familia prefixados.
- Brave/LinkedIn: diagnostico pendente (confirmar qual botao em producao).

### Sessão 11–12/10 (auditoria em andamento)

- Auditoria read-only de 3 anomalias.
- Replay offline dos 3 commits sobre 898 linhas da Gupy — código exonerado.
- Auto-Deploy confirmado como `Yes` no Render.
- Vagas obsoletas ativas medidas: 505 da Gupy + 11 outras.
- Fase 1 desenhada (A3 + A4 + D6 + D7), não implementada.

### Commits pos-20/10
- f44567b: PingWind (bloqueia vaga remota com sinal federal estrangeiro).
- 44bdf3e: regras de paste em COMO_TRABALHAR + PROTOCOLO.
- 02c218d: Solides circuit breaker (timeout 10s, aborta apos 3 falhas).
- 77332d5: vagaExclusivaPcd bloqueia exclusivas/afirmativas PCD.
- 8e41796: LinkedIn publishedAt usa publishedAtEstimado do Brave.
- Suite 295/295.

## Pendências

- Fase 1 (Rastreabilidade e Diagnóstico).
  - Investigar anomalia 3.1 (queda 23→256 da Gupy) via replay.
  - Concluir anomalia 3.3 (E1 - estabilidade da Gupy).
- Implementar Fase 1 em branch.
- Débitos técnicos D2–D8 (ver HANDOFF §4).
- Piloto de sites próprios (30 empresas).
- Refinamento de queries Brave a partir do perfil.
- Reconciliar `jobs.source` com `funil_telemetria.fonte`.
- Fase 2 (futura): botão "segunda opinião por IA" on-demand.
