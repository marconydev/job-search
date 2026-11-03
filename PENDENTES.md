# PENDENTES — Job Search

Lista oficial de tarefas e débitos técnicos para as próximas Sprints.

## 🟡 Sprint 2: Refinamento de Filtros (Hard Cutoff)
- **Senioridade:** Criar bloqueio determinístico para vagas com termos 'Sênior', 'Especialista', 'Lead', 'Coordenador' (caso o perfil não busque esses níveis).
- **Cargos Desconexos:** Refinar a lista de `cargosDesvio` (ex: Dev, Fullstack, Engenheiro de Software) para que sejam barrados no título (Score 0).
- **Ruído Remanescente:** Auditar os logs do Matcher para identificar padrões de vagas que ainda estão passando indevidamente (ex: SEO, Marketing, Vendas).

## 🔵 Sprint 3: Motor de Aderência ATS
- **Cálculo de Score:** Reformular o `job-matcher.ts` para calcular a aderência simulando um ATS real.
- **Dimensões de Peso:** Ponderar Senioridade, Stack Tecnológica, Modelo de Trabalho e Formação.
- **Threshold:** Garantir que o score percentual retornado reflita a probabilidade real de seleção (evitar scores 100 para vagas apenas 'similares').

## 🟣 Sprint 4: Cobertura de Descoberta (Web)
- **Brave/LinkedIn:** Investigar por que vagas encontradas via `Brave` (LinkedIn/Indeed) frequentemente caem em `indefinida` ou são descartadas na extração (Débito D7).
- **Isolamento de Falhas:** Garantir que a queda de um parser (ex: LinkedIn mudou o DOM) não corrompa a execução global da busca.

## 🟤 Débitos Técnicos (Backlog)
- **D2 (Zumbis):** Coletores diretos ainda podem deixar passar vagas fechadas há mais de 21 dias. Criar rotina de reconciliação.
- **D3 (Motivo de Unavailable):** Adicionar a coluna `motivo` na tabela `jobs` ao invés de apenas marcar `unavailable_at`.
- **D4/D5 (Rastreabilidade):** Garantir o preenchimento de `commit_hash` e `perfil_hash` em todas as execuções da telemetria.

---
