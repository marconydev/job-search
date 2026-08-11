CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL,

    company VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    location VARCHAR(255),
    remote BOOLEAN NOT NULL DEFAULT FALSE,

    url TEXT NOT NULL,

    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT jobs_source_external_id_unique
        UNIQUE (source, external_id)
);