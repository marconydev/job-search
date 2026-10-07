-- 013_add_jobs_content_hash.sql
--
-- Hash estável do conteúdo estruturado da vaga (title + company +
-- location + description). Usado para evitar reanálise quando nada
-- relevante mudou entre coletas.

BEGIN;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS jobs_content_hash_idx
  ON jobs(content_hash);

COMMIT;
