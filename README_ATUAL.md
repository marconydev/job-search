# README_ATUAL — Job Search

Snapshot do estado da aplicação após a sessão de outubro/2026.

## Funcionalidades ativas

- 9 coletores diretos: Gupy, Sólides, Vagas.com, GeekHunter, GetOnBoard, Remotive, Remote OK, Jobicy, Arbeitnow.
- Aprendizado e coleta de 6 ATS: Greenhouse, Lever, Workable, Ashby, Recruitee, InHire.
- Descoberta web complementar via Brave Search (opcional, orçamento controlado).
- Cache de buscas web em PostgreSQL com TTL de 7 dias.
- Elegibilidade geográfica Brasil com regras para remoto global, LATAM e listas de cidades.
- Matching determinístico local, score 0–100, corte 60.
- Perfil profissional singleton em JSONB.
- Importação de currículo PDF, DOCX e TXT.
- Sincronização assíncrona com trava, heartbeat e detecção de interrupção.
- Telemetria de funil por execução/fonte em `funil_telemetria` (M1).
- Hash de conteúdo das vagas para evitar reanálise redundante (C11).
- Dashboard com status de nova, vista, aplicada e ignorada.

## Perfil profissional padrão

Foco em Analista de Suporte, Sistemas, Infraestrutura, Implantação, Processos e Dados. Aliases em inglês como "Technical Support" e "Application Support" entram nas buscas nativas por decisão explícita do produto (M2).

## O que mudou em outubro/2026

- Corte centralizado em `MIN_SCORE_RELEVANT` (M9).
- `MATCHER_VERSION` passou para 3.
- Cargos do perfil passaram a virar termos de busca nativa (M2).
- Trava fixa de João Pessoa/PB removida (M3).
- Título fora do foco em português desconta 15 pontos em vez de vetar (M4).
- `localizacoesAceitas` do perfil passa a ser consultado pelo matcher (M11).
- Coluna `content_hash` em `jobs` (C11).
- Endpoint `GET /jobs/telemetria` e repositório de telemetria (M1).
- Suíte de testes passou de 169 para 175 casos.

## Pendências críticas

- Wave B (frontend) não iniciado.
- Conversão dos ATS abaixo do esperado: vários boards retornam 100-150 vagas e entregam 0 aderentes.
- Fontes remotas (`remotive`, `remote-ok`, `arbeitnow`) trazem poucos resultados aderentes.
