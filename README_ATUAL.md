# README_ATUAL — Job Search

Snapshot do estado da aplicação após a sessão de 12/10/2026.

## Funcionalidades ativas

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

## Pendências

- Fechar auditoria das 3 anomalias (queda 23→256, E1).
- Implementar Fase 1 em branch.
- Débitos técnicos D2–D8 (ver HANDOFF §4).
- Piloto de sites próprios (30 empresas).
- Refinamento de queries Brave a partir do perfil.
- Reconciliar `jobs.source` com `funil_telemetria.fonte`.
- Fase 2 (futura): botão "segunda opinião por IA" on-demand.
