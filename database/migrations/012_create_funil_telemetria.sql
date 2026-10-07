-- 012_create_funil_telemetria.sql
--
-- Persiste os contadores do funil por execução/fonte para o dashboard.
-- Não substitui estado_sincronizacao (que guarda o resumo da execução);
-- complementa com granularidade por fonte.

BEGIN;

CREATE TABLE IF NOT EXISTS funil_telemetria (
  id BIGSERIAL PRIMARY KEY,
  execucao_id UUID NOT NULL,
  fonte VARCHAR(80) NOT NULL,
  coletadas INTEGER NOT NULL DEFAULT 0,
  apos_janela INTEGER NOT NULL DEFAULT 0,
  apos_elegibilidade INTEGER NOT NULL DEFAULT 0,
  apos_matcher INTEGER NOT NULL DEFAULT 0,
  importadas INTEGER NOT NULL DEFAULT 0,
  duplicadas INTEGER NOT NULL DEFAULT 0,
  descartes JSONB NOT NULL DEFAULT '{}'::jsonb,
  erros JSONB NOT NULL DEFAULT '[]'::jsonb,
  duracao_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS funil_telemetria_execucao_idx
  ON funil_telemetria (execucao_id);

CREATE INDEX IF NOT EXISTS funil_telemetria_fonte_idx
  ON funil_telemetria (fonte, created_at DESC);

COMMIT;
