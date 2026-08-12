BEGIN;

-- Identifico vagas que foram salvas apenas com os dados disponíveis
-- na descoberta, sem uma extração completa da publicação original.
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS partial BOOLEAN NOT NULL DEFAULT FALSE;

-- Guardo quando ocorreu a última mudança de status.
ALTER TABLE job_matches
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Guardo datas importantes para o histórico das candidaturas.
ALTER TABLE job_matches
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

ALTER TABLE job_matches
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

-- A constraint original foi criada automaticamente pelo PostgreSQL
-- com este nome.
ALTER TABLE job_matches
DROP CONSTRAINT IF EXISTS job_matches_status_check;

ALTER TABLE job_matches
ADD CONSTRAINT job_matches_status_check
CHECK (
  status IN (
    'relevant',
    'viewed',
    'discarded',
    'applied',
    'ignored'
  )
);

CREATE INDEX IF NOT EXISTS job_matches_status_updated_at_idx
ON job_matches(status_updated_at DESC);

COMMIT;