# PENDENTES — Job Search

## Status Atual
✅ **Código de Cobertura (Gupy/Sólides) e Performance** - Em produção (fff2b51).
✅ **Deploy no Render** - Build verde e sincronizado.
✅ **Validação Local** - Typecheck e Build passaram antes do push.

## Ação Imediata Necessária (Para a Próxima Conversa)
O código está em produção, mas a **prova empírica dos resultados** ainda precisa ser rodada.

**Passo 1:** Disparar uma nova sincronização pelo painel (ou via API).
**Passo 2:** Rodar o script de homologação (`C:/Projetos/job-search-diag/verify-full-coverage.cjs`).
**Passo 3:** Analisar o JSON gerado para confirmar:
- As 9 URLs de teste (5 Gupy, 4 Sólides) como `relevant`.
- O tempo da Sólides (esperado < 30s).
- Zero descartes indevidos de PCD inclusivas.

**Passo 4:** Se o script apontar falhas, investigar o JSON e corrigir os filtros finais.
