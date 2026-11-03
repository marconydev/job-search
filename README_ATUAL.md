# README_ATUAL — Job Search

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
