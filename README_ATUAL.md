# README_ATUAL — Job Search

Snapshot do estado da aplicação após a sessão de 08/10/2026.

## Funcionalidades ativas

- 9 coletores diretos: Gupy, Sólides, Vagas.com, GeekHunter, GetOnBoard, Remotive, Remote OK, Jobicy, Arbeitnow.
- Aprendizado e coleta de 6 ATS: Greenhouse, Lever, Workable, Ashby, Recruitee, InHire — com modalidade estruturada preservada.
- Descoberta web complementar via Brave Search (opcional, orçamento controlado).
- Cache de buscas web em PostgreSQL com TTL de 7 dias.
- Trava geográfica v3: presencial só RMPJP, híbrido em todo o Brasil, remoto só com Brasil explícito.
- Matching determinístico local, score 0–100, corte 60.
- Perfil profissional singleton em JSONB.
- Importação de currículo PDF, DOCX e TXT.
- Sincronização assíncrona com trava, heartbeat e detecção de interrupção.
- Telemetria de funil por execução/fonte em `funil_telemetria` (com contador `localizacaoInferida`).
- Hash de conteúdo das vagas para evitar reanálise redundante.
- Fila de ATS prioriza boards produtivos por `coletas_sem_aderentes`.
- Scripts de saneamento da base (dry-run + apply + reverter).

## Sessão de outubro/2026 — o que mudou

- Fase 0.2: `RELATORIO_FASE02.md` (inventário dos 9 coletores + panorama ATS) e `fase02-gerar-relatorio.cjs`.
- Trava geográfica v3 aplicada:
  - Presencial só passa em RMPJP (João Pessoa + 20 municípios oficiais).
  - Híbrido passa em qualquer ponto do Brasil.
  - Remoto só passa com menção explícita ao Brasil.
  - Opção 2: bandeira estrangeira vence `localizacoesAceitas` do perfil.
- ATS Lever, Workable, Ashby, Recruitee e InHire passam a extrair modalidade via `interpretarModalidadeEstruturada` (antes colapsavam híbrido/presencial em `unknown`).
- `localizacaoInferida` separado de `localizacaoIncompativel` na telemetria.
- Fail-fast confirmado: score 0 sem cálculo para vaga geo-bloqueada.
- Saneamento: 227 vagas `relevant` não vistas → `discarded`. Backup reversível em `backend/scripts/.backups/`.
- `PLANO_EXPANSAO.md`: LinkedIn via Brave dork, sites próprios piloto 30–50 empresas, sem LLM no pipeline, sem burlar bloqueio.
- 251 testes backend verdes.

## Pendências

- Piloto de sites próprios (30–50 empresas) — ver `PLANO_EXPANSAO.md`.
- Refinamento de queries Brave a partir do perfil.
- Reconciliar `jobs.source` com `funil_telemetria.fonte`.
- Fase 2 (futura): botão "segunda opinião por IA" on-demand.
