BEGIN;

-- Registros antigos usavam "viewed" como status. A partir desta migration,
-- visualização passa a ser representada apenas por viewed_at.
UPDATE job_matches
SET
  viewed_at = COALESCE(viewed_at, status_updated_at, created_at, NOW()),
  status = 'relevant'
WHERE status = 'viewed';

ALTER TABLE job_matches
DROP CONSTRAINT IF EXISTS job_matches_status_check;

ALTER TABLE job_matches
ADD CONSTRAINT job_matches_status_check
CHECK (
  status IN (
    'relevant',
    'discarded',
    'applied',
    'ignored'
  )
);

-- Ajuda consultas que separam oportunidades abertas novas das já vistas.
CREATE INDEX IF NOT EXISTS job_matches_relevant_viewed_at_idx
ON job_matches(viewed_at)
WHERE status = 'relevant';

COMMIT;