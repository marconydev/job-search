# README_ATUAL — Job Search

Snapshot do estado da aplicação após a sessão de 06-07/10/2026.

## Funcionalidades ativas

- 9 coletores diretos: Gupy, Sólides, Vagas.com, GeekHunter, GetOnBoard, Remotive, Remote OK, Jobicy, Arbeitnow.
- Aprendizado e coleta de 6 ATS: Greenhouse, Lever, Workable, Ashby, Recruitee, InHire.
- Descoberta web complementar via Brave Search (opcional, orçamento controlado).
- Cache de buscas web em PostgreSQL com TTL de 7 dias.
- Elegibilidade geográfica Brasil com regras para remoto global, LATAM e listas de cidades.
- Matching determinístico local, score 0–100, corte 60.
- Trava geográfica em 3 estados (remote | hybrid | on-site | unknown).
- Perfil profissional singleton em JSONB.
- Importação de currículo PDF, DOCX e TXT.
- Sincronização assíncrona com trava, heartbeat e detecção de interrupção.
- Telemetria de funil por execução/fonte em `funil_telemetria`.
- Hash de conteúdo das vagas para evitar reanálise redundante.
- Fila de ATS prioriza boards produtivos por `coletas_sem_aderentes`.

## Sessão de outubro/2026 — o que mudou

- Endpoints Gupy e Sólides corrigidos. Sync subiu de 0 para ~250 vagas/sync.
- Migrations 007 a 015 aplicadas no Neon.
- M1 (telemetria 8 baldes), M2 (cargos do perfil como termos), M3 (trava em 3 estados), M4, M9, M11, C11.
- Trava geográfica: presencial fora de João Pessoa/PB vetado; híbrida e remota livres no Brasil.
- `titulosExcluidos` expandido: estágio, aprendiz, C-level executivo.
- `elegibilidade-localizacao`: adicionadas variações de EUA (us, u.s., eua, estados unidos).
- Re-análise em massa no Neon (1197 análises).
- Fase 1A: vocabulário de `search-queries.ts` expandido nas 7 famílias (sinônimos PT/EN, variações N1/N2/N3 e níveis Sênior/Pleno/Júnior); `LIMITE_RELACIONADOS_POR_FAMILIA_GUPY = 5`.
- Fase 1B-Backend: `GET /jobs/telemetria/resumo` (funil da última execução, série diária e top motivos de descarte); `agregarLinhas` + `resumirTelemetria`; migration 016 (índice em `created_at DESC`).

## Pendências

- Fase 1B-Frontend: componente no painel consumindo `GET /jobs/telemetria/resumo`.
- Fase 2 (futura): botão "segunda opinião por IA" on-demand.
