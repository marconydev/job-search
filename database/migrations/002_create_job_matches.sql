CREATE TABLE job_matches (
    id BIGSERIAL PRIMARY KEY,

    job_id BIGINT NOT NULL
        REFERENCES jobs(id)
        ON DELETE CASCADE,

    local_score SMALLINT NOT NULL
        CHECK (local_score BETWEEN 0 AND 100),

    matched_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    reasons JSONB NOT NULL DEFAULT '[]'::jsonb,

    status VARCHAR(20) NOT NULL
        CHECK (
            status IN (
                'relevant',
                'discarded',
                'applied',
                'ignored'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Uma vaga possui apenas uma análise local ativa.
    -- Novas análises atualizam esse registro em vez de criar duplicatas.
    CONSTRAINT job_matches_job_id_unique
        UNIQUE (job_id)
);

CREATE INDEX job_matches_status_idx
    ON job_matches(status);

CREATE INDEX job_matches_local_score_idx
    ON job_matches(local_score DESC);