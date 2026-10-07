-- 014_add_ats_aderentes.sql
--
-- Registra quantas vagas cada board ATS entregou na última coleta.
--
-- Isso permite afastar boards consistentemente improdutivos (por exemplo,
-- empresas estrangeiras sem vagas no Brasil) sem precisar removê-los.
-- O cap na ordenação (LEAST(coletas_sem_aderentes, 10)) impede que um
-- board fique permanentemente no fim da fila.

BEGIN;

ALTER TABLE fontes_ats
  ADD COLUMN IF NOT EXISTS ultimos_aderentes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE fontes_ats
  ADD COLUMN IF NOT EXISTS coletas_sem_aderentes INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS fontes_ats_produtividade_idx
  ON fontes_ats (ativa, coletas_sem_aderentes, ultima_coleta_em);

COMMIT;
