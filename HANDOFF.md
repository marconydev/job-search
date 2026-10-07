# HANDOFF — Job Search

## 1. Estado atual

Branch de referência: main.

Última sequência de commits publicamente confirmada termina em 03/09/2026 com fix: melhora elegibilidade de vagas remotas globais.

Durante a sessão de 06/10/2026, um conjunto de mudanças foi aplicado localmente (não commitado): M9, M2, M3, M4, C11, M1 e M11. Migrations 012 e 013 foram aplicadas apenas no Postgres local. O banco de produção (Supabase) ainda não tem essas tabelas/colunas.

Ambiente de desenvolvimento: Node.js 24.13.1. package.json não declara engines.

## 2. Ambiente de dados

- Produção (Render) usa DATABASE_URL do Supabase.
- Dev local (Windows) tem DATABASE_URL vazio e cai no fallback DB_HOST=localhost, DB_NAME=job_search. Esse Postgres local está vazio.
- Fluxo de teste adotado: validar alterações via sincronização em produção, depois commitar e deployar.

## 3. Concluído nesta sessão

- M9 — corte único de relevância.
- M2 — cargos do perfil como termos de busca nativa.
- M3 — trava de João Pessoa/PB removida.
- M4 — título fora do foco desconta 15 pontos.
- C11 — hash de conteúdo em jobs.
- M1 — telemetria persistida por execução/fonte + endpoint.
- M11 — localizacoesAceitas propagado até avaliarElegibilidadeBrasil.
- Suíte de testes: 175 passando, 0 falhando.

## 4. Em andamento / não consolidado

- Wave B (frontend) não iniciado. Os arquivos de `frontend/src/` ainda não foram lidos para alteração.
- Conversão dos ATS abaixo do esperado: vários boards retornam 140-150 vagas e entregam 0 aderentes.

## 5. Próximos passos

- P0 — commit e push das mudanças da sessão.
- P1 — Wave B: dashboard do funil consumindo `GET /jobs/telemetria`.
- P1 — calibração de conversão dos ATS.
- P2 — revisar cobertura de `remotive`, `remote-ok` e `arbeitnow`.

## 6. Decisões

- Brave é orçamento controlado, não substituta de coleta direta.
- Matching é local, determinístico, sem LLM obrigatório.
- Candidatura é manual.
- PostgreSQL é a única fonte de estado.
- Sincronização é assíncrona.
- Wave A (backend) precede Wave B (frontend).
- Testar em produção via sincronização, sem banco de dev separado.
- localizacoesAceitas do perfil é soberana quando o usuário declara explicitamente.

## 7. Pendências e bloqueios

- Migrações 012/013 pendentes no Supabase.
- Frontend não mapeado.
- Estratégia de paginação por portal agregador: A DEFINIR.
- Lista final de consultas Brave a remover: A DEFINIR.

## 8. Como continuar

    cd backend && npm run test && npm run test:typecheck && npm run build
    cd ../frontend && npm run lint && npm run build

Cuidado: npm run dev no backend aponta para o Postgres local vazio.

## 9. Pontos a evitar

- Integração sem necessidade validada.
- Duplicar fonte que já tem coletor direto.
- Brave para o que um portal público faz melhor.
- Regra de localização dentro de coletor.
- Matching diretamente em rotas.
- Automatizar candidatura.
- Commitar segredos.
