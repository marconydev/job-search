CREATE TABLE IF NOT EXISTS perfil_profissional (
  id SMALLINT PRIMARY KEY
    DEFAULT 1
    CHECK (id = 1),

  dados JSONB NOT NULL,

  nome_arquivo_origem VARCHAR(255),

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT NOW()
);