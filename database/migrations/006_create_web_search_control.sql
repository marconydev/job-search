CREATE TABLE IF NOT EXISTS controle_busca_web (
  id SMALLINT PRIMARY KEY
    CHECK (id = 1),

  dados JSONB NOT NULL,

  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT NOW()
);