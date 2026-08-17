CREATE TABLE IF NOT EXISTS fontes_ats (
  id BIGSERIAL PRIMARY KEY,

  provedor VARCHAR(30) NOT NULL
    CHECK (
      provedor IN (
        'greenhouse',
        'lever',
        'workable',
        'recruitee',
        'ashby'
      )
    ),

  identificador VARCHAR(255) NOT NULL,

  variante VARCHAR(30) NOT NULL
    DEFAULT 'padrao',

  url_origem TEXT NOT NULL,

  ativa BOOLEAN NOT NULL
    DEFAULT TRUE,

  descoberta_em TIMESTAMPTZ NOT NULL
    DEFAULT NOW(),

  ultima_vista_em TIMESTAMPTZ NOT NULL
    DEFAULT NOW(),

  ultima_coleta_em TIMESTAMPTZ,

  falhas_consecutivas INTEGER NOT NULL
    DEFAULT 0
    CHECK (falhas_consecutivas >= 0),

  ultimo_erro TEXT,

  CONSTRAINT fontes_ats_unica
    UNIQUE (
      provedor,
      identificador,
      variante
    )
);

CREATE INDEX IF NOT EXISTS
  fontes_ats_coleta_idx
ON fontes_ats (
  ativa,
  ultima_coleta_em
);