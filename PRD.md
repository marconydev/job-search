# PRD — Job Search

## 1. Objetivo

Aplicação pessoal de descoberta, análise e acompanhamento de vagas que use o perfil profissional para reduzir ruído e priorizar oportunidades com maior aderência. A candidatura continua manual.

## 2. Público-alvo

Uso pessoal, um único perfil persistido. Sem arquitetura multiusuário.

## 3. Escopo dentro

- Perfil profissional editável com cargos, competências, experiências, formações, cursos, localizações aceitas e títulos excluídos.
- Importação de currículo PDF/DOCX/TXT.
- Coleta direta de fontes e descoberta web complementar.
- Aprendizado de ATS e reuso em sincronizações seguintes.
- Elegibilidade geográfica antes do matching.
- Matching local determinístico com score 0–100.
- Dashboard com status (nova, vista, aplicada, ignorada).
- Sincronização assíncrona com trava, heartbeat e telemetria.

## 4. Escopo fora

- Candidatura automática, preenchimento de formulário, envio de currículo.
- Multiusuário, cobrança, CRM de candidatos.
- LLM externo como requisito do matching.
- APIs privadas que exijam credencial de empresa recrutadora.

## 5. Requisitos funcionais

- RF01 Perfil profissional único em JSONB.
- RF02 Currículo PDF/DOCX/TXT com sugestão de estrutura.
- RF03 Coletores diretos sem depender da Brave.
- RF04 Descoberta complementar por Brave.
- RF05 Cache de buscas web com TTL.
- RF06 Reconhecer e aprender fontes ATS.
- RF07 Normalizar vagas em modelo comum.
- RF08 Elegibilidade geográfica antes do matching.
- RF09 Score e motivos calculados localmente.
- RF10 Deduplicar por `source + external_id`.
- RF11 Acompanhar status manual.
- RF12 Sincronizar em background com estado persistido.
- RF13 Registrar contadores de funil por execução/fonte.
- RF14 Considerar `localizacoesAceitas` no matcher.
- RF15 Distinguir modalidade (remote | hybrid | on-site | unknown).
- RF16 Vetar presencial fora de João Pessoa/PB, aceitar híbrida e remota em todo o Brasil.

## 6. Requisitos não funcionais

- RNF01 Bearer token no backend, Basic Auth no frontend.
- RNF02 Tolerar reinício durante sincronização.
- RNF03 Orçamento Brave controlado (30/dia, 1000/mês, cache 7 dias).
- RNF04 Regras de negócio com testes automatizados.
- RNF05 Separação entre coletores, descoberta, extractors, matcher, persistência, rotas e UI.

## 7. Regras de negócio

1. Perfil é a referência principal.
2. Cargos de desvio não viram estratégia principal.
3. Score 0–100; corte 60 em `MIN_SCORE_RELEVANT`.
4. Vaga aplicada ou ignorada não perde decisão manual.
5. Visualização separada do status.
6. Dedup por origem + identificador externo.
7. Cache Brave respeita TTL.
8. Busca web e coleta direta são camadas diferentes.
9. Candidatura não é automatizada.
10. Elegibilidade territorial antes do score final.
11. Modalidade estruturada da fonte sempre vence.
12. Título fora do foco em português desconta 15 pontos; não veta.
13. `localizacoesAceitas` amplia aceitação explícita; exclusão explícita vence.
14. Presencial só João Pessoa/PB (inclui Campina Grande e Paraíba).
15. Híbrida e remota aceitas em qualquer lugar do Brasil.

## 8. Critérios de aceite

- Perfil salvo persiste após reinício.
- Coletores diretos rodam sem Brave.
- Vagas de fontes diferentes coexistem sem duplicação.
- Vaga com localização incompatível sai com score 0.
- Presencial fora de JP/PB sai com score 0.
- Híbrida e remota passam mesmo fora de JP/PB.
- Título excluído é rejeitado.
- Sync retorna rápido e executa em background.
- Tentativa simultânea não cria duas execuções.

## 9. Riscos

- Mudança de HTML/endpoint das fontes.
- Rate limit ou bloqueio anti-bot.
- Falsos positivos em vagas remotas internacionais.
- Dependência opcional da Brave.

## 10. Roadmap

- P0: concluído — endpoints, migrations, M1-M11, C11, trava 3 estados.
- P1: expansão de vocabulário (7 famílias em `search-queries.ts`).
- P1: observabilidade agregada.
- P2: revisar falsos positivos residuais.
- P2 (futura): botão IA on-demand por vaga.

## 11. Pontos a definir

- Estratégia de paginação por ATS: A DEFINIR.
- Lista final de consultas Brave a remover: A DEFINIR.
