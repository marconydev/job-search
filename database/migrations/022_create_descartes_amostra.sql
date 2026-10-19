CREATE TABLE IF NOT EXISTS descartes_amostra (
  id BIGSERIAL PRIMARY KEY,
  execucao_id UUID NOT NULL,
  fonte VARCHAR(255) NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  trecho_descricao TEXT,
  regra_disparada VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_descartes_amostra_created_at ON descartes_amostra (created_at DESC);