# PRD — Job Search

## 1. Objetivo

Aplicação pessoal de descoberta, análise e acompanhamento de vagas que use o perfil profissional para reduzir ruído e priorizar oportunidades com maior aderência. A candidatura continua manual.

## 2. Público-alvo

Uso pessoal, um único perfil persistido. Não há arquitetura multiusuário.

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
- RF13 Registrar contadores de funil por execução/fonte (M1).
- RF14 Considerar `localizacoesAceitas` no matcher (M11).

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
11. Modalidade remota prefere dado estruturado.
12. Título fora do foco em português desconta; não veta (M4).
13. `localizacoesAceitas` amplia aceitação explícita (M11).

## 8. Critérios de aceite

- Perfil salvo persiste após reinício.
- Coletores diretos rodam sem Brave.
- Brave pode ser habilitada separadamente.
- Vagas de fontes diferentes coexistem sem duplicação.
- Vaga aderente recebe score compatível.
- Vaga incompatível sai com score 0.
- Título excluído é rejeitado.
- Sync retorna rápido e executa em background.
- Tentativa simultânea não cria duas execuções.
- Execução interrompida é detectada por heartbeat expirado.

## 9. Riscos

Mudança de HTML/endpoint das fontes, rate limit, falsos negativos, falsos positivos, ambiguidade de localização, dependência opcional da Brave, limites do ambiente gratuito.

## 10. Roadmap

- P0: consolidar abstração de portais agregadores.
- P1: testes de regressão de cobertura.
- P2: revisar falsos negativos via telemetria.
- P3: manter sincronização, cache, orçamento e lifecycle estáveis.

## 11. Pontos a definir

- Estratégia de paginação por portal: A DEFINIR.
- Lista final de consultas Brave a remover: A DEFINIR.
- Limite ideal por portal em sincronização: A DEFINIR.
