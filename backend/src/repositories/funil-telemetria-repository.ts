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

export type FunilResumo = {
  coletadas: number
  aposJanela: number
  aposElegibilidade: number
  aposMatcher: number
  importadas: number
  duplicadas: number
}

export type FonteResumo = FunilResumo & {
  fonte: string
  duracaoMs: number | null
}

type PontoSerieDiaria = {
  dia: string
  coletadas: number
  importadas: number
  syncs: number
}

type MotivoDescarte = {
  motivo: string
  total: number
}

type UltimaExecucaoResumo = {
  execucaoId: string
  finalizadaEm: string
  funil: FunilResumo
  porFonte: FonteResumo[]
  erros: string[]
}

export type ResumoTelemetria = {
  ultimaExecucao: UltimaExecucaoResumo | null
  serieDiaria: PontoSerieDiaria[]
  topDescartes: MotivoDescarte[]
  janelaDias: number
}

type LinhaTelemetria = {
  fonte: string | null
  coletadas: number | null
  apos_janela: number | null
  apos_elegibilidade: number | null
  apos_matcher: number | null
  importadas: number | null
  duplicadas: number | null
  descartes: unknown
  erros: unknown
  duracao_ms: number | null
  created_at: string | Date | null
}

function comoNumero(valor: unknown): number {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

/**
 * Agrega as linhas cruas de uma execucao.
 *
 * Exportada como funcao pura para permitir teste unitario sem
 * tocar o banco de dados.
 */
export function agregarLinhas(rows: LinhaTelemetria[]): {
  funil: FunilResumo
  porFonte: FonteResumo[]
  descartes: Record<string, number>
  erros: string[]
} {
  const funil: FunilResumo = {
    coletadas: 0,
    aposJanela: 0,
    aposElegibilidade: 0,
    aposMatcher: 0,
    importadas: 0,
    duplicadas: 0
  }

  const porFonte: FonteResumo[] = []
  const descartes: Record<string, number> = {}
  const erros: string[] = []

  for (const linha of rows) {
    const c = comoNumero(linha.coletadas)
    const j = comoNumero(linha.apos_janela)
    const e = comoNumero(linha.apos_elegibilidade)
    const m = comoNumero(linha.apos_matcher)
    const i = comoNumero(linha.importadas)
    const d = comoNumero(linha.duplicadas)

    funil.coletadas += c
    funil.aposJanela += j
    funil.aposElegibilidade += e
    funil.aposMatcher += m
    funil.importadas += i
    funil.duplicadas += d

    porFonte.push({
      fonte: String(linha.fonte ?? ""),
      coletadas: c,
      aposJanela: j,
      aposElegibilidade: e,
      aposMatcher: m,
      importadas: i,
      duplicadas: d,
      duracaoMs: linha.duracao_ms == null ? null : comoNumero(linha.duracao_ms)
    })

    const desc = linha.descartes
    if (desc && typeof desc === "object") {
      for (const [chave, valor] of Object.entries(desc as Record<string, unknown>)) {
        const n = Number(valor)
        if (Number.isFinite(n)) {
          descartes[chave] = (descartes[chave] ?? 0) + n
        }
      }
    }

    if (Array.isArray(linha.erros)) {
      for (const msg of linha.erros) {
        if (typeof msg === "string" && msg.trim() !== "") {
          erros.push(msg)
        }
      }
    }
  }

  return { funil, porFonte, descartes, erros }
}

function normalizarDias(dias: number): number {
  if (!Number.isFinite(dias) || dias <= 0) return 7
  return Math.min(Math.floor(dias), 30)
}

/**
 * Resumo agregado da telemetria do funil.
 *
 * Q1: execucao mais recente.
 * Q2: linhas cruas dessa execucao (agregadas em JS).
 * Q3: serie diaria na janela solicitada.
 *
 * Nenhuma query interpola valores de entrada; tudo passa por $1.
 */
export async function resumirTelemetria(dias: number): Promise<ResumoTelemetria> {
  const janela = normalizarDias(dias)

  const r1 = await db.query(
    `SELECT execucao_id
       FROM funil_telemetria
      GROUP BY execucao_id
      ORDER BY MAX(created_at) DESC
      LIMIT 1`
  )

  const execucaoId =
    r1.rows.length > 0 && r1.rows[0].execucao_id != null
      ? String(r1.rows[0].execucao_id)
      : null

  let ultimaExecucao: UltimaExecucaoResumo | null = null
  let topDescartes: MotivoDescarte[] = []

  if (execucaoId) {
    const r2 = await db.query(
      `SELECT fonte, coletadas, apos_janela, apos_elegibilidade,
              apos_matcher, importadas, duplicadas, descartes, erros,
              duracao_ms, created_at
         FROM funil_telemetria
        WHERE execucao_id = $1
        ORDER BY id ASC`,
      [execucaoId]
    )

    const linhas = r2.rows as LinhaTelemetria[]
    const agregado = agregarLinhas(linhas)

    const ultimaData = linhas.length > 0 ? linhas[linhas.length - 1].created_at : null

    const finalizadaEm = ultimaData
      ? new Date(ultimaData as string | Date).toISOString()
      : new Date().toISOString()

    ultimaExecucao = {
      execucaoId,
      finalizadaEm,
      funil: agregado.funil,
      porFonte: agregado.porFonte,
      erros: agregado.erros
    }

    topDescartes = Object.entries(agregado.descartes)
      .filter(([, total]) => total > 0)
      .map(([motivo, total]) => ({ motivo, total }))
      .sort((a, b) => b.total - a.total || a.motivo.localeCompare(b.motivo))
      .slice(0, 10)
  }

  const r3 = await db.query(
    `SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS dia,
            SUM(coletadas)::int   AS coletadas,
            SUM(importadas)::int  AS importadas,
            COUNT(DISTINCT execucao_id)::int AS syncs
       FROM funil_telemetria
      WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
      GROUP BY dia
      ORDER BY dia ASC`,
    [janela]
  )

  const serieDiaria: PontoSerieDiaria[] = (r3.rows as Array<Record<string, unknown>>).map(
    linha => ({
      dia: String(linha.dia ?? ""),
      coletadas: comoNumero(linha.coletadas),
      importadas: comoNumero(linha.importadas),
      syncs: comoNumero(linha.syncs)
    })
  )

  return {
    ultimaExecucao,
    serieDiaria,
    topDescartes,
    janelaDias: janela
  }
}
