import { db } from "../database/connection.js"

export type AmostraDescarte = {
  execucaoId: string
  fonte: string
  motivo: string
  trechoDescricao: string | null
  regraDisparada: string | null
}

export async function salvarAmostraDescarte(amostra: AmostraDescarte) {
  try {
    await db.query(
      `INSERT INTO descartes_amostra (execucao_id, fonte, motivo, trecho_descricao, regra_disparada)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        amostra.execucaoId,
        amostra.fonte,
        amostra.motivo,
        amostra.trechoDescricao,
        amostra.regraDisparada
      ]
    )
  } catch (e) {
    console.warn("Erro ao salvar amostra de descarte:", e)
  }
}