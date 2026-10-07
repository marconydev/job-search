import { db } from "../database/connection.js"

export type TelemetriaFonte = {
  execucaoId: string

  fonte: string

  coletadas: number

  aposJanela: number

  aposElegibilidade: number

  aposMatcher: number

  importadas: number

  duplicadas: number

  descartes?: Record<string, number>

  erros?: string[]

  duracaoMs?: number
}

export async function registrarTelemetriaFonte(t: TelemetriaFonte) {
  await db.query(
    `INSERT INTO funil_telemetria (
       execucao_id, fonte, coletadas, apos_janela, apos_elegibilidade,
       apos_matcher, importadas, duplicadas, descartes, erros, duracao_ms
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11)`,
    [
      t.execucaoId,
      t.fonte,
      t.coletadas,
      t.aposJanela,
      t.aposElegibilidade,
      t.aposMatcher,
      t.importadas,
      t.duplicadas,
      JSON.stringify(t.descartes ?? {}),
      JSON.stringify(t.erros ?? []),
      t.duracaoMs ?? null
    ]
  )
}

export async function listarTelemetriaDaExecucao(execucaoId: string) {
  const r = await db.query(
    `SELECT fonte, coletadas, apos_janela, apos_elegibilidade,
            apos_matcher, importadas, duplicadas, descartes, erros,
            duracao_ms, created_at
       FROM funil_telemetria
      WHERE execucao_id = $1
      ORDER BY id ASC`,
    [execucaoId]
  )

  return r.rows
}

export async function listarTelemetriaRecente(limite = 50) {
  const r = await db.query(
    `SELECT execucao_id, fonte, coletadas, apos_janela, apos_elegibilidade,
            apos_matcher, importadas, duplicadas, descartes, erros,
            duracao_ms, created_at
       FROM funil_telemetria
      ORDER BY created_at DESC
      LIMIT $1`,
    [Math.max(1, Math.floor(limite))]
  )

  return r.rows
}