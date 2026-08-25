BEGIN;

ALTER TABLE job_matches
ADD COLUMN IF NOT EXISTS matcher_version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS job_matches_matcher_version_idx
ON job_matches(matcher_version);

COMMIT;