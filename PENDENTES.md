# PENDENTES — Job Search

Lista oficial de tarefas e débitos técnicos.

## 🟢 Sprints 1, 2 e 3 (ATS): Concluídas
- **Sprint 1:** Correção da Aba Novas (janela de 7 dias).
- **Sprint 2:** Hard Cutoff de Senioridade e Cargos Desvio. Aba "Possivelmente Expiradas" (> 21 dias).
- **Sprint 3 (ATS 2.0):** Pesos Redistribuídos (Cargo 35, Stack 30), Zonal Regex (1.5x), Missing Keywords e Tiers de UI.

## 🟣 Sprint 4: Cobertura de Descoberta (Web)
- **Brave/LinkedIn:** Investigar por que vagas encontradas via Brave frequentemente caem em `indefinida` ou são descartadas na extração (Débito D7).
- **Isolamento de Falhas:** Garantir que a queda de um parser (ex: LinkedIn mudou o DOM) não corrompa a execução global da busca.

## 🟤 Débitos Técnicos (Backlog)
- **D2 (Zumbis / Automação):** Criar rotina automática (cronjob) para testar as URLs das vagas em "Possivelmente Expiradas" e marcar como `unavailable_at` apenas se derem 404 (evitando deletar vagas da Gupy que estão só demorando).
- **D3 (Motivo de Unavailable):** Adicionar a coluna `motivo` na tabela `jobs` ao invés de apenas marcar `unavailable_at`.
- **D4/D5 (Rastreabilidade):** Garantir o preenchimento de `commit_hash` e `perfil_hash` em todas as execuções da telemetria.
- **Remotar Jobs (Camada 3):** Adicionar a dork `site:remotar.com.br/job` no Brave e ensinar o `page-classifier` a ler as páginas.
