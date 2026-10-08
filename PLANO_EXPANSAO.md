# PLANO_EXPANSAO — LinkedIn, Brave dorks e sites próprios

Sessão de 08/10/2026. Documento de arquitetura e diretrizes — sem implementação de código nesta fase.

## 1. Princípios não negociáveis

- **Sem LLM no pipeline de sincronização.** Matching continua determinístico e local.
- **Sem burlar bloqueio.** LinkedIn não recebe login, cookies, Playwright, Puppeteer nem requisições autenticadas. Só o que é público.
- **Brave é orçamento controlado.** Cada query conta. Cache em PostgreSQL (TTL 7 dias) já obrigatório.
- **PostgreSQL é a única fonte de estado.**
- **Nenhuma integração nova sem necessidade validada** (PROTOCOLO §7).

## 2. Frente LinkedIn — só descoberta indireta

LinkedIn tem ToS restritivo e bloqueio agressivo a automação. Duas rotas viáveis, uma descartada:

| Rota | Decisão | Motivo |
|---|---|---|
| API oficial de Jobs (`/v2/jobPostings`) | ❌ | Requer parceria comercial aprovada. Não se aplica. |
| Scraping autenticado (Playwright/Puppeteer com login) | ❌ | Viola ToS. Risco de banimento da conta pessoal. |
| **Brave Search com dork** (`site:linkedin.com/jobs/view`) | ✅ | Usa só a API pública da Brave. Nunca toca o LinkedIn diretamente. |

**Fluxo aprovado:** Brave retorna URLs do LinkedIn → `page-inspector.ts` já extrai dados da página pública → `triagem-vagas-web.ts` filtra → pipeline normal.

## 3. Brave Search — queries ancoradas no perfil

Query base construída por família:

```
site:linkedin.com/jobs/view
  ("Analista de Suporte" OR "Analista de Sistemas" OR "Application Support")
  ("Brasil" OR "Brazil" OR "remoto" OR "remote")
  -"estágio" -"aprendiz" -"C-level"
```

Regras derivadas do perfil (`cargosPrincipais` + `cargosRelacionados`, **nunca** `cargosDesvio`):

- Máximo `LIMITE_RELACIONADOS_POR_FAMILIA_GUPY` termos por query.
- Excluir sempre: estágio, aprendiz, C-level executivo (já em `titulosExcluidos`).
- Contexto geográfico fixo em `Brasil`.
- Sem cargos em inglês quando a fonte for portal brasileiro (regra já vigente em `search-queries.ts`).
- Orçamento diário controlado por `controle_busca_web`.

Sites alvo prioritários (Brave dork): `linkedin.com/jobs/view`, `glassdoor.com.br`, `indeed.com.br`.

## 4. Frente sites próprios — piloto 30–50 empresas

Objetivo: substituir descoberta web difusa por **coleta direta de boards conhecidos**, com ATS mapeado.

### 4.1 Metodologia

1. Lista curada de 30 empresas com carreiras públicas, sediadas no Brasil ou com vagas remotas Brasil, atuando em áreas compatíveis com o perfil (TI/suporte/infra).
2. Para cada empresa, identificar o ATS (Greenhouse, Lever, Workable, Ashby, Recruitee, InHire).
3. Inserir em `fontes_ats` (provedor + identificador + variante).
4. Rodar 2 semanas.
5. Métrica: `importadas / coletadas > 5%` por board. Boards abaixo disso viram `falhas_consecutivas` e caem via `coletas_sem_aderentes`.

### 4.2 Priorização dinâmica (já implementada)

- `fontes-ats.ts` já prioriza boards por produtividade.
- Boards sem aderência caem naturalmente da fila.
- Sem intervenção manual recorrente.

### 4.3 Métricas de sucesso do piloto

| Métrica | Meta |
|---|---|
| Vagas aderentes novas por semana | ≥ 10 |
| Taxa de importação média | ≥ 5% |
| Boards com 0 aderentes após 2 semanas | ≤ 30% |
| Custo | R$ 0 (APIs públicas) |

## 5. Cronograma sugerido

| Semana | Frente |
|---|---|
| 1–2 | Curadoria manual: lista de 30 empresas + identificação de ATS |
| 3–4 | Inserção em `fontes_ats` + rodada piloto |
| 5 | Análise: quantos boards passam da meta de 5% |
| 6 | Expansão para 50 empresas se piloto produtivo |
| 7+ | Refinamento das queries Brave com base nos títulos encontrados |

## 6. Custos

| Recurso | Custo |
|---|---|
| Brave Search API | plano atual do usuário (verificar quota mensal) |
| Coleta ATS | R$ 0 |
| LLM | R$ 0 (não usado no pipeline) |
| Infra | já provisionada (Render + Neon) |

## 7. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Banimento do LinkedIn | Nunca autenticar; usar só Brave dork |
| Estouro de quota Brave | Cache TTL 7d + `controle_busca_web` |
| Board ATS morto | `falhas_consecutivas` + `coletas_sem_aderentes` |
| Falso positivo nas queries | Revisão manual semanal do relatório de funil |
| Perfil editado e queries obsoletas | Regeneração automática a partir do perfil |

## 8. Não vamos fazer

- Login no LinkedIn.
- Playwright / Puppeteer / Selenium no LinkedIn.
- LLM no pipeline de sincronização.
- Scraping de sites cujo `robots.txt` bloqueia a rota.
- Candidatura automática.
- Dependência nova sem autorização explícita.

---

*Documento criado em 08/10/2026, junto da trava geográfica v3.*
