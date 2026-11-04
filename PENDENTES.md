# PENDENTES — Job Search

Lista oficial de tarefas e débitos técnicos para as próximas Sprints.

## 🟡 Sprint 2: Refinamento de Filtros (Hard Cutoff)
- OK **Senioridade (03/11/2026):** Bloqueio deterministico implementado. Campo `senioridadesExcluidas` em `PerfilProfissional`, cutoff antes de `pontuarCargo`. `MATCHER_VERSION` bumpado.
- **Cargos Desconexos:** Refinar a lista de `cargosDesvio` (ex: Dev, Fullstack, Engenheiro de Software) para que sejam barrados no título (Score 0).
- **Ruído Remanescente:** Auditar os logs do Matcher para identificar padrões de vagas que ainda estão passando indevidamente (ex: SEO, Marketing, Vendas).

## 🔵 Sprint 3: Motor de Aderência ATS
- OK **Cálculo de Score (04/11/2026):** Reformulado. Motor ATS com pesos redistribuídos.
- OK **Dimensões de Peso (04/11/2026):** Cargo 35, Stack 30, Exp 15, Formação 10, Cursos 5, Local +5, Remoto +10.
- OK **Threshold (04/11/2026):** Corte em 60 exige stack técnica. Título sozinho soma ~50.

## 🟣 Sprint 4: Cobertura de Descoberta (Web)
- **Brave/LinkedIn:** Investigar por que vagas encontradas via `Brave` (LinkedIn/Indeed) frequentemente caem em `indefinida` ou são descartadas na extração (Débito D7).
- **Isolamento de Falhas:** Garantir que a queda de um parser (ex: LinkedIn mudou o DOM) não corrompa a execução global da busca.

## 🟤 Débitos Técnicos (Backlog)
- **D2 (Zumbis):** Coletores diretos ainda podem deixar passar vagas fechadas há mais de 21 dias. Criar rotina de reconciliação.
- **D3 (Motivo de Unavailable):** Adicionar a coluna `motivo` na tabela `jobs` ao invés de apenas marcar `unavailable_at`.
- **D4/D5 (Rastreabilidade):** Garantir o preenchimento de `commit_hash` e `perfil_hash` em todas as execuções da telemetria.

---
