BEGIN;

ALTER TABLE fontes_ats
  DROP CONSTRAINT IF EXISTS fontes_ats_provedor_check;

ALTER TABLE fontes_ats
  ADD CONSTRAINT fontes_ats_provedor_check
  CHECK (
    provedor IN (
      'greenhouse',
      'lever',
      'workable',
      'recruitee',
      'ashby',
      'inhire'
    )
  );

COMMIT;
