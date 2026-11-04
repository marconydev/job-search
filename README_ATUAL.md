# README_ATUAL — Job Search

## Sessao 04/11/2026 - Sprint 2: ATS 2.0
- **Missing Keywords:** skills que a vaga pede e o perfil nao tem viram tags `[MISSING] X` em `reasons` (JSONB).
- **Zonal Regex:** skills na zona de "Requisitos" valem 1.5x. Fallback defensivo 1.0x.
- **Tiers:** `TIER_PERFEITO=85`, `TIER_ADERENTE=70`, `TIER_BORDERLINE=60` exportados em `config/matcher.ts`.
- **Etapa 2 (Frontend):** pendente – renderizar tags e cores.

---

## Sessao 04/11/2026 - Sprint 2: Motor ATS
- **Score rebalanceado:** cargo 35, stack 30, exp 15, formacao 10, cursos 5, local +5. Titulo sozinho nao passa no corte de 60.
- **`MATCHER_VERSION = 6`.** Proximo sync reprocessa as vagas sob a nova regra.

---

## Sessao 03/11/2026 - Sprint 2: Hard Cutoff de Senioridade
- **Filtro:** `job-matcher.ts` bloqueia Senior/Especialista/Lead/Coordenador/Gerente/Manager quando perfil e Pleno/Junior. Roda antes do bonus de nucleo.
- **cargosDesvio:** normalizacao de acento e word boundary.
- **Perfil:** campo `senioridadesExcluidas: string[]` + merge-defaults.
- **D8:** `MATCHER_VERSION` incrementado.

---

Snapshot do estado da aplicação após a sessão de 03/11/2026 (Conclusão da Sprint 1).

## Funcionalidades Ativas (Corrigidas e Homologadas)
- **Aba 'Novas' (Sprint 1):** A definição de vaga nova agora é estritamente uma janela móvel de 7 dias (`created_at >= NOW() - INTERVAL '7 days'`). O sistema não depende mais da tabela de sincronização global, impedindo que um sync com Brave 'apague' as vagas do sync anterior.
- **Filtro de Data da Dashboard:** O `COALESCE(published_at, created_at)` foi removido das queries principais. Isso impede que vagas recém-descobertas sejam escondidas por terem datas de publicação antigas na fonte.
- **Infraestrutura (Neon/Render):** A conexão foi forçada a usar IPv4 para evitar `ETIMEDOUT`. O cache do Render foi desativado via `Manual Deploy` para garantir a execução do código atualizado.
- **UI/Modal de Sync:** O modal de sincronização agora detalha a diferença entre vagas inseridas e vagas descartadas pelo funil.
- **Banco de Dados:** O Neon passou por um reprocessamento em massa. Vagas de Dev, PCDs, presenciais fora da RMPJP e scores baixos foram devidamente movidas para `discarded`.

## Números Atuais
- **67 vagas** na aba 'Novas'.
- **195+ vagas** restantes em aberto (após limpeza de lixo).
- **241 testes unitários** passando (Backend).

## Próximos Passos
- Iniciar a Sprint 2 (ver arquivo PENDENTES.md).

---
