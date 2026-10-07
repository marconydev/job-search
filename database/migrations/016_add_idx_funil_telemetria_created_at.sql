-- 016_add_idx_funil_telemetria_created_at.sql
--
-- Indice em funil_telemetria.created_at para a serie diaria do
-- endpoint GET /jobs/telemetria/resumo (Fase 1B-Backend).
--
-- A consulta da serie usa WHERE created_at >= NOW() - (N * INTERVAL '1 day'),
-- portanto um indice DESC em created_at evita sequential scan no Neon.

CREATE INDEX IF NOT EXISTS idx_funil_telemetria_created_at
  ON funil_telemetria (created_at DESC);
