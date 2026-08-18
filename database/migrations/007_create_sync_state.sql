CREATE TABLE IF NOT EXISTS estado_sincronizacao (
  id SMALLINT PRIMARY KEY
    DEFAULT 1
    CHECK (id = 1),

  execucao_id UUID,

  estado VARCHAR(20) NOT NULL
    DEFAULT 'ociosa'
    CHECK (
      estado IN (
        'ociosa',
        'executando',
        'concluida',
        'falhou',
        'interrompida'
      )
    ),

  modo VARCHAR(20)
    CHECK (
      modo IS NULL
      OR modo IN (
        'economico',
        'brave'
      )
    ),

  etapa VARCHAR(40),

  mensagem TEXT,

  resultado JSONB,

  iniciado_em TIMESTAMPTZ,

  heartbeat_em TIMESTAMPTZ,

  concluido_em TIMESTAMPTZ,

  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT NOW()
);

INSERT INTO estado_sincronizacao (
  id,
  estado
)
VALUES (
  1,
  'ociosa'
)
ON CONFLICT (id) DO NOTHING;