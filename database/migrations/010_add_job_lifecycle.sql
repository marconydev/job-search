BEGIN;

-- Identifica o board específico que confirmou uma oportunidade.
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS source_key VARCHAR(255);

-- Última vez em que uma coleta confirmou que a oportunidade ainda existia.
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Para os registros históricos, a primeira confirmação disponível é o
-- momento em que a vaga entrou no nosso banco.
UPDATE jobs
SET last_seen_at = created_at
WHERE last_seen_at IS NULL;

ALTER TABLE jobs
ALTER COLUMN last_seen_at SET DEFAULT NOW();

ALTER TABLE jobs
ALTER COLUMN last_seen_at SET NOT NULL;

-- Preenchido somente quando temos evidência de que a publicação saiu
-- de uma fonte autoritativa.
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS unavailable_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Backfill de boards ATS conhecidos.
--
-- Isso permite que vagas antigas já existentes também participem da
-- reconciliação de disponibilidade.
-- ---------------------------------------------------------------------------

-- Lever global.
UPDATE jobs
SET source_key =
  'ats:lever:global:' || split_part(url, '/', 4)
WHERE
  source = 'lever'
  AND source_key IS NULL
  AND url ~* '^https?://jobs\.lever\.co/[^/]+/';

-- Lever Europa.
UPDATE jobs
SET source_key =
  'ats:lever:eu:' || split_part(url, '/', 4)
WHERE
  source = 'lever'
  AND url ~* '^https?://jobs\.eu\.lever\.co/[^/]+/';

-- Greenhouse.
UPDATE jobs
SET source_key =
  'ats:greenhouse:padrao:' || split_part(url, '/', 4)
WHERE
  source = 'greenhouse'
  AND source_key IS NULL
  AND (
    url ~* '^https?://boards\.greenhouse\.io/[^/]+/'
    OR url ~* '^https?://boards\.eu\.greenhouse\.io/[^/]+/'
    OR url ~* '^https?://job-boards\.greenhouse\.io/[^/]+/'
  );

-- Ashby.
UPDATE jobs
SET source_key =
  'ats:ashby:padrao:' || split_part(url, '/', 4)
WHERE
  source = 'ashby'
  AND source_key IS NULL
  AND url ~* '^https?://jobs\.ashbyhq\.com/[^/]+/';

-- Workable no domínio apply.workable.com.
UPDATE jobs
SET source_key =
  'ats:workable:padrao:' || split_part(url, '/', 4)
WHERE
  source = 'workable'
  AND source_key IS NULL
  AND url ~* '^https?://apply\.workable\.com/[^/]+/';

-- Workable em subdomínio próprio.
UPDATE jobs
SET source_key =
  'ats:workable:padrao:' ||
  split_part(
    split_part(url, '://', 2),
    '.',
    1
  )
WHERE
  source = 'workable'
  AND source_key IS NULL
  AND url ~* '^https?://[^./]+\.workable\.com/'
  AND split_part(
    split_part(url, '://', 2),
    '.',
    1
  ) NOT IN (
    'www',
    'apply',
    'jobs',
    'api',
    'help'
  );

-- Recruitee.
UPDATE jobs
SET source_key =
  'ats:recruitee:padrao:' ||
  split_part(
    split_part(url, '://', 2),
    '.',
    1
  )
WHERE
  source = 'recruitee'
  AND source_key IS NULL
  AND url ~* '^https?://[^./]+\.recruitee\.com/';

CREATE INDEX IF NOT EXISTS jobs_source_key_idx
ON jobs(source_key)
WHERE source_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS jobs_reference_date_idx
ON jobs(
  (
    COALESCE(
      published_at,
      created_at
    )
  ) DESC
);

COMMIT;