-- 015_add_workplace_type.sql
--
-- Separa "presencial", "híbrido", "remoto" e "desconhecido".
--
-- O booleano remote não distingue presencial de híbrido. A política
-- geográfica precisa dessa distinção para aceitar híbrida em qualquer
-- lugar do Brasil mas restringir presencial a João Pessoa/PB.

BEGIN;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS workplace_type VARCHAR(20) NOT NULL DEFAULT 'unknown';

ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS jobs_workplace_type_check;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_workplace_type_check
  CHECK (workplace_type IN ('remote', 'hybrid', 'on-site', 'unknown'));

CREATE INDEX IF NOT EXISTS jobs_workplace_type_idx
  ON jobs (workplace_type);

COMMIT;
