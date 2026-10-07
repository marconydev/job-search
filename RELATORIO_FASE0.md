# Relatório — Fase 0.1 (baseline e inventário)

Sessão de 07/10/2026. Leitura direta do Neon, sem alteração de comportamento.

## 1. Última execução de sync

- **execucao_id:** `2c841ca3-0878-4e20-8273-cb6d6b6bdce4`
- **Fim:** 2026-10-07T13:42:22.444Z

## 2. Telemetria por fonte (última execução)

| Fonte | coletadas | apos_janela | apos_eleg | apos_matcher | importadas | duplicadas | duracao_ms |
|---|---|---|---|---|---|---|---|
| gupy | 483 | 363 | 338 | 229 | 3 | 226 | 53795 |
| solides | 139 | 32 | 32 | 21 | 1 | 20 | 43869 |
| vagas | 8 | 6 | 6 | 1 | 0 | 1 | 3079 |
| geekhunter | 100 | 100 | 100 | 1 | 0 | 1 | 5878 |
| getonboard | 102 | 44 | 34 | 1 | 0 | 1 | 5277 |
| remotive | 17 | 11 | 5 | 0 | 0 | 0 | 803 |
| remote-ok | 1 | 0 | 0 | 0 | 0 | 0 | 788 |
| jobicy | 84 | 84 | 82 | 1 | 0 | 1 | 3196 |
| arbeitnow | 2 | 2 | 0 | 0 | 0 | 0 | 1898 |
| ats:greenhouse:talkdesk2 | 36 | 19 | 6 | 2 | 2 | 0 | null |
| ats:greenhouse:collegetrack | 11 | 10 | 0 | 0 | 0 | 0 | null |
| ats:greenhouse:startree | 5 | 0 | 0 | 0 | 0 | 0 | null |
| ats:greenhouse:steercrm | 5 | 5 | 0 | 0 | 0 | 0 | null |
| ats:greenhouse:prospectus | 5 | 3 | 0 | 0 | 0 | 0 | null |
| ats:greenhouse:synthesishealth | 1 | 1 | 0 | 0 | 0 | 0 | null |
| ats:lever:thinkahead | 148 | 148 | 0 | 0 | 0 | 0 | null |
| ats:lever:filevine | 107 | 107 | 0 | 0 | 0 | 0 | null |

## 3. Totais por status (job_matches)

| Status | Total |
|---|---|
| Total geral | 1197 |
| Novas (relevant, viewed_at IS NULL) | 936 |
| Vistas (relevant, viewed_at preenchido) | 15 |
| Aplicadas | 36 |
| Ignoradas | 19 |
| Sem análise | 0 |

## 4. Distribuição de score por fonte (baldes)

| Fonte | 0 | 1–39 | 40–49 | 50–59 | ≥60 | Total |
|---|---|---|---|---|---|---|
| gupy | 0 | 0 | 0 | 0 | 807 | 807 |
| agregador | 0 | 0 | 0 | 0 | 59 | 59 |
| solides | 0 | 0 | 0 | 0 | 23 | 23 |
| desconhecido | 0 | 0 | 0 | 0 | 22 | 22 |
| indeed | 0 | 0 | 0 | 0 | 19 | 19 |
| lever | 0 | 0 | 0 | 1 | 16 | 17 |
| linkedin | 0 | 0 | 0 | 0 | 11 | 11 |
| catho | 0 | 0 | 0 | 0 | 10 | 10 |
| greenhouse | 0 | 0 | 0 | 0 | 10 | 10 |
| glassdoor | 0 | 0 | 0 | 0 | 5 | 5 |
| vagas | 0 | 0 | 0 | 0 | 5 | 5 |
| jobicy | 0 | 0 | 0 | 0 | 4 | 4 |
| infojobs | 0 | 0 | 0 | 0 | 4 | 4 |
| jooble | 0 | 0 | 0 | 0 | 3 | 3 |
| geekhunter | 0 | 0 | 0 | 0 | 2 | 2 |
| workable | 0 | 0 | 0 | 0 | 1 | 1 |
| manual | 0 | 0 | 0 | 0 | 1 | 1 |
| workday | 0 | 0 | 0 | 0 | 1 | 1 |
| remotive | 0 | 0 | 0 | 0 | 1 | 1 |
| getonboard | 0 | 0 | 0 | 0 | 1 | 1 |

Observação: os baldes 1–39, 40–49 e 50–59 estão praticamente vazios no banco (só 1 vaga em 50–59). Todo descarte hoje é score 0 ou score ≥ 60.

## 5. Chaves de `descartes` — comportamento real

Da telemetria da última execução:

- `foraDaJanela` > 0 em gupy (120), solides (107), getonboard (58), remotive (6), remote-ok (1), startree (5), collegetrack (1), prospectus (2), talkdesk2 (17).
- `localizacaoIncompativel` > 0 em gupy (25), getonboard (10), remotive (6), jobicy (2), arbeitnow (2), steercrm (5), collegetrack (10), prospectus (3), talkdesk2 (13), thinkahead (148), filevine (107), synthesishealth (1).
- `scoreZero` > 0 em gupy (106), solides (11), vagas (5), geekhunter (99), getonboard (33), remotive (5), jobicy (81), talkdesk2 (4).
- `matcherAbaixoDoMinimo` = `scoreZero` em todos os casos — os buckets hoje medem a mesma coisa.
- `score1a39`, `score40a49` = 0 em todas as fontes.
- `score50a59` > 0 só em gupy (3).
- `tituloForaFoco` = 0 em todas as fontes.

## 6. Achados relevantes (sem mudar nada ainda)

1. **Boa parte dos coletores ATS entrega 0 vagas ao funil mesmo coletando muito** — `thinkahead` (148/148 rejeitadas) e `filevine` (107/107) caem 100% por `localizacaoIncompativel`. Não geraram nenhuma vaga aderente. `startree` (5/5), `steercrm` (5/5), `collegetrack` (11/11) idem.
2. **`jobicy`, `geekhunter` e `arbeitnow`** entregam volume razoável mas com `scoreZero` quase integral. Merecem análise de por que o matcher zera tudo — pode ser só título fora do perfil, o que é esperado.
3. **Gupy é o motor de aquisição** — 483 coletadas, 229 aderentes (47%), 3 importadas novas, 226 duplicadas. A taxa de duplicação é alta porque a mesma vaga aparece em múltiplas execuções.
4. **`source` inclui valores de descoberta web**: `agregador`, `desconhecido`, `linkedin`, `indeed`, `catho`, `glassdoor`, `infojobs`, `jooble`, `workday`, `manual`. Toda essa camada passa pela Brave/descoberta — o painel mistura fontes diretas e descobertas sem distinção visual.
5. **A amostra de 40–59 está dominada por** `Analista de Dados` (que é cargo relacionado) e vagas em inglês de `workday`/`linkedin` com `company` = "Empresa não identificada" — a extração não resolve a empresa nesses casos.
6. **Total geral de 1197**, sendo 936 "novas". Isso é o público-alvo da Fase 1 (saneamento).

## 7. Pendente para a próxima sessão

- **Fase 0.2**: inventário dos 9 coletores (enumeração, cobertura, vagas/sync, última execução com sucesso).
- **Fase 1**: saneamento da base — comando `reprocess:eligibility`, dry-run, `reason_code`.
- **Fase 2**: piloto de sites próprios (30–50 empresas).
- **Fase 3**: Brave como descoberta + queries do perfil.
- **Fase 4**: implementação.

## 8. Decisões já confirmadas pelo usuário

- Região metropolitana de João Pessoa conta como local.
- Híbrido em João Pessoa conta.

---

*Leitura direta do Neon em 07/10/2026 via `baseline-fase0.cjs`.*
