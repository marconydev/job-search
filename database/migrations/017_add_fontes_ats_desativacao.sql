-- Fase 1: rastreamento da desativacao de fontes ATS.
--
-- Adiciona duas colunas para registrar quando e por que um board foi
-- desativado. A desativacao acontece quando o board acumula 5 falhas
-- tecnicas PERMANENTES (404, 410) consecutivas. Falhas transitorias
-- (timeout, 5xx, 429) nao incrementam o contador e nao desativam.
--
-- A linha nunca e removida — apenas marcada como inativa. Reativacao
-- acontece via nova descoberta web (registrarFonteAts) ou manualmente.

ALTER TABLE fontes_ats
  ADD COLUMN IF NOT EXISTS desativada_em timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_desativacao text;

CREATE INDEX IF NOT EXISTS idx_fontes_ats_ativa_falhas
  ON fontes_ats (ativa, falhas_consecutivas);
