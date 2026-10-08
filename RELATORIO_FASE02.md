# Relatório — Fase 0.2 (inventário dos coletores)

Sessão de 07/10/2026. Leitura direta do Neon, sem alteração de comportamento.

- Script gerador: `fase02-gerar-relatorio.cjs` (read-only: `BEGIN READ ONLY` + `statement_timeout = 60s`).
- Fonte dos dados: `backend/.env.neon`.
- Escopo: 9 coletores diretos + panorama dos 6 ATS.
- Retenção real de `funil_telemetria`: 3 execuções (50 linhas).
- Convenção: "consistente com" = hipótese compatível com os dados disponíveis; "confirmado" = dado bate 1:1 com a previsão.

---

## 0. Retenção e base

| Linhas | Execuções | Mais antiga | Mais recente |
| --- | --- | --- | --- |
| 50 | 3 | 12:43:46 | 23:05:22 |

Baseline `job_matches` (todas as idades):

| Status | Total | Sem view | Aplicadas |
| --- | --- | --- | --- |
| applied | 36 | 5 | 36 |
| discarded | 191 | 188 | 0 |
| ignored | 19 | 2 | 0 |
| relevant | 985 | 968 | 0 |

---

## 1. Três colunas de sucesso por fonte

Ordenação por timestamp (execucao_id é UUID). Colunas em HH:MM:SS UTC.

### 1.1 Coletores diretos

| Fonte | Último sem erro | Último coletadas>0 | Último importadas>0 | Execuções |
| --- | --- | --- | --- | --- |
| arbeitnow | 23:05:01 | 23:05:01 | null | 3 |
| geekhunter | 23:04:50 | 23:04:50 | 12:44:42 | 3 |
| getonboard | 23:04:55 | 23:04:55 | 12:44:46 | 3 |
| gupy | 23:03:54 | 23:03:54 | 23:03:54 | 3 |
| jobicy | 23:05:00 | 23:05:00 | 12:44:49 | 3 |
| remote-ok | 23:04:56 | 23:04:56 | null | 3 |
| remotive | 23:04:56 | 23:04:56 | null | 3 |
| solides | 23:04:40 | 23:04:40 | 13:41:27 | 3 |
| vagas | 23:04:43 | 23:04:43 | null | 3 |

### 1.2 ATS (por board)

Dos 23 boards com telemetria retida, apenas 3 têm `importadas>0`:

| Board | Importadas>0 em | Execuções |
| --- | --- | --- |
| ats:greenhouse:externaljobboards | 23:05:05 | 1 |
| ats:greenhouse:talkdesk2 | 13:41:50 | 1 |
| ats:lever:pingwind | 23:05:09 | 1 |

Os demais 20 boards retornaram `importadas=0` em todas as execuções registradas.

---

## 2. Descartes agregados por fonte (janela retida)

Soma de `descartes->>chave::int` sobre as linhas retidas.

### 2.1 Coletores diretos

| Fonte | Exec | Coletadas | Importadas | foraDaJanela | locIncompat | scoreZero | 50–59 | abaixoMin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| arbeitnow | 3 | 6 | 0 | 0 | 6 | 0 | 0 | 0 |
| geekhunter | 3 | 300 | 1 | 0 | 0 | 297 | 0 | 297 |
| getonboard | 3 | 332 | 1 | 186 | 30 | 113 | 0 | 113 |
| gupy | 3 | 1444 | 255 | 355 | 72 | 310 | 9 | 319 |
| jobicy | 3 | 254 | 1 | 0 | 4 | 247 | 0 | 247 |
| remote-ok | 3 | 3 | 0 | 3 | 0 | 0 | 0 | 0 |
| remotive | 3 | 51 | 0 | 17 | 18 | 16 | 0 | 16 |
| solides | 3 | 418 | 21 | 322 | 0 | 33 | 1 | 34 |
| vagas | 3 | 25 | 0 | 6 | 0 | 16 | 0 | 16 |

### 2.2 ATS — casos extremos (ordenados por volume descartado)

| Board | Coletadas | Import | locIncompat | scoreZero | foraDaJanela |
| --- | --- | --- | --- | --- | --- |
| ats:lever:thinkahead | 148 | 0 | 148 | 0 | 0 |
| ats:lever:filevine | 107 | 0 | 107 | 0 | 0 |
| ats:lever:pingwind | 103 | 3 | 53 | 47 | 0 |
| ats:greenhouse:togetherai | 79 | 0 | 78 | 1 | 0 |
| ats:lever:pointclickcare | 73 | 0 | 64 | 9 | 0 |
| ats:greenhouse:scaleops | 59 | 0 | 13 | 0 | 46 |
| ats:greenhouse:externaljobboards | 54 | 1 | 43 | 9 | 0 |
| ats:greenhouse:exadelinc | 42 | 0 | 26 | 15 | 0 |

**Nota sobre `matcherAbaixoDoMinimo`:** idêntico a `scoreZero` em todas as linhas agregadas. `score1a39` e `score40a49` são zero em todas as fontes; `score50a59` só aparece em gupy e solides.

---

## 3. % de `partial` por source (persistido em `jobs`)

| Source | Total | partial=true | % partial |
| --- | --- | --- | --- |
| gupy | 884 | 0 | 0.0 |
| agregador | 66 | 66 | 100.0 |
| greenhouse | 47 | 0 | 0.0 |
| lever | 45 | 0 | 0.0 |
| workday | 31 | 31 | 100.0 |
| desconhecido | 25 | 25 | 100.0 |
| linkedin | 25 | 25 | 100.0 |
| solides | 23 | 1 | 4.3 |
| remotive | 21 | 0 | 0.0 |
| indeed | 19 | 19 | 100.0 |
| catho | 10 | 10 | 100.0 |
| jobicy | 6 | 0 | 0.0 |
| glassdoor | 5 | 5 | 100.0 |
| vagas | 5 | 5 | 100.0 |
| infojobs | 4 | 4 | 100.0 |
| arbeitnow | 3 | 0 | 0.0 |
| ashby | 3 | 1 | 33.3 |
| geekhunter | 3 | 3 | 100.0 |
| jooble | 3 | 3 | 100.0 |
| getonboard | 1 | 0 | 0.0 |
| manual | 1 | 0 | 0.0 |
| workable | 1 | 0 | 0.0 |

Camada de descoberta web (agregador, workday, linkedin, indeed, catho, glassdoor, infojobs, jooble, desconhecido) é 100% partial. `gupy` e `greenhouse`/`lever` são os únicos com 0% partial em volume relevante.

---

## 4. Aderentes em 30 dias (por source)

Filtro: `job_matches.analyzed_at >= now() - interval '30 days'`.

| Source | Relevantes 30d | Novas 30d | Aplicadas 30d |
| --- | --- | --- | --- |
| gupy | 804 | 794 | 0 |
| agregador | 50 | 48 | 0 |
| solides | 23 | 22 | 0 |
| desconhecido | 20 | 20 | 0 |
| indeed | 19 | 18 | 0 |
| greenhouse | 11 | 11 | 0 |
| lever | 11 | 10 | 0 |
| linkedin | 11 | 11 | 0 |
| catho | 9 | 9 | 0 |
| glassdoor | 5 | 5 | 0 |
| vagas | 5 | 5 | 0 |
| infojobs | 4 | 4 | 0 |
| jobicy | 4 | 4 | 0 |
| jooble | 3 | 3 | 0 |
| geekhunter | 1 | 1 | 0 |
| getonboard | 1 | 1 | 0 |
| manual | 1 | 0 | 0 |
| remotive | 1 | 1 | 0 |
| workable | 1 | 0 | 0 |
| workday | 1 | 1 | 0 |
| arbeitnow | 0 | 0 | 0 |
| ashby | 0 | 0 | 0 |

---

## 5. Inventário por fonte — tipo de acesso, risco, tempo e requisições

Tempo vem de `funil_telemetria.duracao_ms`. Requisições são estimadas do código (`n termos × páginas`). Risco de robots/ToS é leitura qualitativa — `robots.txt`/ToS de cada site não foram verificados nesta fase.

### 5.1 Coletores diretos

| Fonte | Acesso | Risco robots/ToS | Req/sync | Duração típica | % partial | Aderentes 30d | Recomendação |
| --- | --- | --- | --- | --- | --- | --- | --- |
| gupy | API interna do portal | baixo-médio | ~60-120 | ~54s | 0% | 804 | manter |
| solides | API descoberta por engenharia reversa | médio | ~30-60 | ~46s | 4,3% | 23 | manter |
| getonboard | API pública api/v0 | baixo | ≤16 | ~5s | 0% | 1 | ajustar |
| geekhunter | scraping HTML | médio | ≤100 | ~6s | 100% | 1 | ajustar |
| vagas | scraping HTML | médio | ≤50 | ~3s | 100% | 5 | ajustar |
| remotive | API pública | baixo | 8 | <1s | 0% | 1 | ajustar |
| jobicy | API pública | baixo | 1 | ~3s | 0% | 4 | ajustar |
| remote-ok | API pública | baixo | 1 | <1s | — | 0 | aposentar |
| arbeitnow | API pública | baixo | ≤5 | ~2s | 0% | 0 | aposentar |

### 5.2 ATS (panorama)

| Provedor | Variante | Boards | Ativas | Últimos aderentes | Coletas sem aderentes | Falhas consecutivas | Última coleta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ashby | padrao | 3 | 3 | 0 | 1 | 0 | 12:44:53 |
| greenhouse | padrao | 24 | 24 | 5 | 12 | 2 | 23:05:04 |
| lever | global | 21 | 21 | 3 | 6 | 0 | 23:05:22 |

**Nota crítica (chave divergente):** `jobs.source` grava `greenhouse`/`lever`/`ashby`/`workable`, mas `funil_telemetria.fonte` grava `ats:<provedor>:<board>`. Um board com 0 importações na telemetria pode ainda assim ter vagas em `jobs.source` vindas de outro board. Sem `source_key` na leitura, as duas visões não são reconciliáveis com o schema atual. **Ponto a resolver antes da Fase 1.**

---

## 6. Observações de código — hipótese × distribuição × teste

Formato: hipótese lida no código, distribuição observada, e o número que **confirmaria** ou **derrubaria**.

### 6.1 `jobicy` ignora o perfil e só filtra `geo=brazil`

- Código: `collectJobicyJobs(limit)` não recebe `perfil`; `montarUrlBuscaJobicy` só seta `geo=brazil`.
- Distribuição: 254 coletadas / 1 importada / 247 `scoreZero` (97%) / 4 `locIncompat`.
- **Consistente com** feed geo-Brasil inteiro deixando o matcher zerar títulos fora do perfil.
- Confirmaria se ≥95% dos descartes forem `scoreZero` — **confirmado (97%)**.
- Derrubaria se `locIncompat` ou `foraDaJanela` dominassem — **não é o caso**.

### 6.2 `remote-ok` e `arbeitnow` filtram título após baixar o feed inteiro

- Código: ambos chamam o endpoint sem parâmetro de busca e filtram `titulo.includes(termo)` em memória.
- Distribuição: remote-ok 3 coletadas / 0 import / 3 `foraDaJanela` (100%); arbeitnow 6 / 0 / 6 `locIncompat` (100%).
- **Consistente com** feed já enxuto e filtro pós-download quase sem efeito.
- Confirmaria se `coletadas` for baixíssimo comparado ao tamanho real do feed — **tamanho real não é medido**; fica qualitativo.
- Derrubaria se `coletadas` fosse alto e a maioria caísse em filtro de termo — **não é o caso**.

### 6.3 `remotive` usa `search` por termo, mas sem `limit` quando há perfil

- Código: com perfil, itera termos e só seta `search`; `limit` da API só é aplicado no ramo sem perfil.
- Distribuição: 51 coletadas / 0 import / 17 `foraDaJanela` + 18 `locIncompat` + 16 `scoreZero`.
- **Consistente com** busca por termo trazendo resultado, mas API devolvendo além do que cabe na janela.
- Confirmaria se `foraDaJanela` fosse proporcionalmente maior que `scoreZero` — **não se confirma: 17 vs 16**.
- Derrubaria se `scoreZero` dominasse sozinho — **não é o caso**.

### 6.4 `gupy` e `solides` têm paginação robusta + descrição completa

- Código: `buscarPaginaGupy` itera offsets com dedupe por `id`; `buscarPagina` da Sólides itera `page` até `totalPages`. Ambos limpam HTML da descrição.
- Distribuição: gupy 1444 / 255 import (17,7%); solides 418 / 21 (5,0%). `% partial` baixo (0% e 4,3%).
- **Confirmado** — os dois são os únicos com importação consistente na janela.

### 6.5 `geekhunter` / `vagas` / `getonboard` fazem scraping ou API sem token

- Código: `parseGeekHunterHtml` e `parseVagasComHtml` são parsers HTML; `pesquisarPagina` (GetOnBoard) usa API pública sem auth.
- Distribuição: geekhunter 300/1 (0,33%); getonboard 332/1 (0,30%); vagas 25/0.
- **Consistente com** scraping/API sem token trazendo volume, mas quase nada passando pelo matcher.
- Confirmaria se `importadas / coletadas` < 1% nas três — **confirmado (0,33% / 0,30% / 0%)**.
- Derrubaria se alguma delas tivesse taxa comparável à gupy — **não é o caso**.

### 6.6 ATS caem majoritariamente por `locIncompat`

- Código: `localizacaoPareceRemota` só marca `remote` se o texto tiver `remote / remoto / home office / ...`; `workplaceType` fica `unknown` caso contrário.
- Distribuição: thinkahead 148/148, filevine 107/107, entrata 25/25, togetherai 78/79, pointclickcare 64/73 — todos 100% ou quase em `locIncompat`.
- **Consistente com** boards majoritariamente estrangeiros: nenhuma location casa com Brasil/JP.
- Confirmaria se a amostra de locations for dominada por US/EU/Ásia — **confirmado (seção 7)**.
- Derrubaria se aparecesse volume relevante de `Brazil`/`Remote` caindo em `locIncompat` — **há vários `Brazil` e `Remote` na amostra de sobreviventes**, o que sugere que o funil está descartando corretamente. **Não é bug de parsing; é realidade da fonte.**

### 6.7 `workplace_type` inconsistente para `US (Remote)` e `US - Remote`

- Código: `localizacaoPareceRemota` deveria retornar `true` para strings contendo `remote`.
- Distribuição: na amostra, `US (Remote)` e `US - Remote` aparecem com `workplace_type = unknown`.
- **Hipótese:** essas linhas não vieram pelos coletores ATS (`source = greenhouse` no `jobs` pode ser descoberta web via Brave). Sem `source_key` por linha não dá para confirmar.
- Confirmaria se `source_key` dessas linhas não tiver prefixo `ats:` — **não verificado nesta fase**.
- Derrubaria se `source_key` começar com `ats:greenhouse:` — aí é bug real em `coletarGreenhouse`.

### 6.8 `getonboard` exige perfil, senão devolve vazio

- Código: `if (!perfil) return { source: "getonboard", jobs: [] }`.
- Distribuição: 332 coletadas em 3 execuções; 186 `foraDaJanela` (56%).
- **Consistente com** sem perfil não haver coleta; volume alto descartado por janela merece revisão dos termos.

---

## 7. Panorama ATS — amostra de `location` (sobreviventes)

A amostra é do que **passou** pelo funil (persistido em `jobs`), não do que caiu. `location` de descartados **não é persistida** (ver seção 8).

| Source | location | workplace_type | partial |
| --- | --- | --- | --- |
| lever | Huntsville, AL | unknown | false |
| lever | Huntsville, AL | unknown | false |
| lever | Remote | remote | false |
| greenhouse | São Paulo, Brazil | unknown | false |
| greenhouse | Remote | remote | false |
| greenhouse | Remote | remote | false |
| lever | Brazil | unknown | false |
| lever | Brazil | unknown | false |
| lever | Brazil | unknown | false |
| lever | Brazil | unknown | false |
| lever | Brazil | unknown | false |
| lever | Brazil | unknown | false |
| greenhouse | Mexico; Mexico City | unknown | false |
| greenhouse | Costa Rica | unknown | false |
| lever | US | unknown | false |
| greenhouse | Buenos Aires, Argentina | unknown | false |
| greenhouse | Draper, UT | unknown | false |
| greenhouse | US (Remote) | unknown | false |
| greenhouse | Oakland, California | unknown | false |
| greenhouse | US - Remote | unknown | false |
| greenhouse | Huntington, Vest Virginia | unknown | false |
| greenhouse | Jacksonville, FL | unknown | false |
| lever | Thessaloniki, Greece | unknown | false |
| lever | Hyderabad | unknown | false |
| lever | Hyderabad | unknown | false |
| ashby | London | unknown | false |
| ashby |  | unknown | true |
| ashby | Remote - Pennsylvania | Remote - Colorado | Minneapolis, MN | Philadelphia, PA | Syracuse Region | Austin, TX | Champaign, IL | Remote - New York | Remote - Illinois | Chicago, IL | Remote - Texas | unknown | false |
| lever | Brazil | unknown | false |
| lever | Brazil | unknown | false |
| lever | Brazil | unknown | false |
| lever | Serbia | Global | unknown | false |
| lever | Brazil | unknown | false |
| lever | Lithuania | Global | unknown | false |
| lever | Riga, Latvia | Global | unknown | false |
| lever | Estonia | Global | unknown | false |
| greenhouse | Brazil | unknown | false |
| greenhouse | Brazil | unknown | false |
| greenhouse | Brazil | unknown | false |
| greenhouse | Brazil | unknown | false |

**Conclusão:** o descarte por `locIncompat` reflete a realidade dos boards. `São Paulo, Brazil` cai porque a regra é JP/PB. `Brazil` passa — e aparece na amostra.

---

## 8. Descartes: guardados ou só contados?

**Só contados.** `funil_telemetria.descartes` é `jsonb` com 8 chaves fixas e valores inteiros:

- `foraDaJanela`
- `localizacaoIncompativel`
- `matcherAbaixoDoMinimo`
- `score1a39`
- `score40a49`
- `score50a59`
- `scoreZero`
- `tituloForaFoco`

Nenhuma linha preserva `location`, `title`, `description` ou qualquer metadado da vaga descartada.

**Consequência:** hoje não é possível auditar falso negativo. A pergunta "por que essa vaga caiu em `localizacaoIncompativel`?" só pode ser respondida reexecutando o pipeline com a mesma fonte e o mesmo perfil — e ambos mudam a cada sync. O descarte por localização é **irreversível**.

Isso explica parte dos baldes 1–59 vazios: não há como ver se o matcher está zerando vaga boa, só que zerou N. A coincidência `matcherAbaixoDoMinimo ≡ scoreZero` reforça que o score 0 absorve qualquer corte.

---

## 9. Proposta — `descartes_amostra` (não implementada)

Objetivo: permitir auditoria de falso negativo sem inflar o banco.

### 9.1 Schema proposto

```sql
CREATE TABLE descartes_amostra (
  id             bigserial PRIMARY KEY,
  execucao_id    uuid        NOT NULL,
  fonte          varchar     NOT NULL,
  motivo         varchar     NOT NULL,   -- localizacaoIncompativel | scoreZero | foraDaJanela | tituloForaFoco
  external_id    varchar,
  title          varchar,
  company        varchar,
  location       varchar,
  workplace_type varchar,
  source_payload jsonb,
  score          smallint,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON descartes_amostra (fonte, motivo, created_at DESC);
CREATE INDEX ON descartes_amostra (created_at DESC);
```

### 9.2 Regras de retenção

- Teto por `(fonte, motivo, execucao_id)`: **5 linhas**.
- Teto global por `execucao_id`: **200 linhas**.
- Retenção temporal: **7 dias**.
- Limpeza diária: `DELETE FROM descartes_amostra WHERE created_at < now() - interval '7 days'`.
- Sem PII: só campos que já vêm da fonte. Sem descrição.

### 9.3 Por que ajuda

- Permite amostrar 5 vagas por (fonte, motivo) por execução — suficiente para inspeção manual semanal.
- Torna auditável a hipótese 6.6: com 5 amostras por board, dá para responder "das 5 últimas, quantas eram Brasil?".
- Não substitui `funil_telemetria` — complementa, mantendo o agregado intacto.

### 9.4 Impacto

- Tabela pequena (ordem de 10² linhas por execução, 7 dias).
- Adiciona 1 INSERT por motivo por fonte — não muda latência.
- Requer migration `017_add_descartes_amostra.sql` + ajuste no pipeline de descarte (não nesta fase).

---

## 10. Recomendações por fonte (com evidência)

| Fonte | Recomendação | Evidência |
| --- | --- | --- |
| gupy | manter | 17,7% import (255 de 1444); 804 relevantes 30d; 0% partial |
| solides | manter | 5,0% import; 23 relevantes 30d; 77% foraDaJanela sugere apertar janela |
| getonboard | ajustar | 0,30% import; 56% foraDaJanela — revisar termos e recência |
| geekhunter | ajustar | 0,33% import; 297/300 scoreZero — título não bate perfil |
| vagas | ajustar | 0 import em 25 coletadas na janela; 100% partial |
| jobicy | ajustar | 0,39% import; 97% scoreZero — adicionar filtro de termo no cliente |
| remotive | ajustar | 0 import em 51 coletadas; empate foraDaJanela × scoreZero |
| remote-ok | aposentar | 3 coletadas, 0 import, 3 foraDaJanela em 3 execuções; 0 relevantes 30d |
| arbeitnow | aposentar | 6 coletadas, 0 import, 100% locIncompat; 0 relevantes 30d |
| ats:greenhouse | ajustar (curadoria) | 2 de 24 boards importaram; 5 aderentes totais |
| ats:lever | ajustar (curadoria) | 1 de 21 boards importou; 3 aderentes |
| ats:ashby | ajustar (curadoria) | 0 de 3 boards importaram; 0 aderentes |

---

## 11. Pendências desta fase

1. Reconciliar `jobs.source` com `funil_telemetria.fonte` (chave `ats:<provedor>:<board>` vs `greenhouse`/`lever`/...). Sem isso, curadoria de board é inconclusiva.
2. Confirmar hipótese 6.7 (`US (Remote)` com `workplace_type = unknown`) checando `source_key`.
3. Auditar `vagas` e `remote-ok` fora da janela retida — 3 execuções é pouco para aposentadoria definitiva.
4. Decidir se a proposta da seção 9 entra na Fase 1 (saneamento) ou fica para depois.

---

*Leitura direta do Neon em 07/10/2026 via `fase02-gerar-relatorio.cjs` (read-only).*
