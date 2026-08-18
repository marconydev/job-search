import { db } from "../database/connection.js"

import type { PaginaDescoberta } from "../types/discovery.js"

export type RegistroConsultaCache = {
  consultadoEm: string

  paginas: PaginaDescoberta[]
}

export type CacheBuscas = {
  versao: 1

  consultas: Record<string, RegistroConsultaCache>

  chamadasPorDia: Record<string, number>
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
}

/**
 * Eu valido a estrutura mínima antes de utilizar o conteúdo persistido.
 *
 * Desta forma um valor incompleto no banco não quebra todo o processo
 * de descoberta de vagas.
 */
export function cacheBuscaEhValido(valor: unknown): valor is CacheBuscas {
  if (!ehObjeto(valor)) {
    return false
  }

  if (valor.versao !== 1) {
    return false
  }

  if (!ehObjeto(valor.consultas) || !ehObjeto(valor.chamadasPorDia)) {
    return false
  }

  for (const registro of Object.values(valor.consultas)) {
    if (!ehObjeto(registro)) {
      return false
    }

    if (typeof registro.consultadoEm !== "string" || !Array.isArray(registro.paginas)) {
      return false
    }
  }

  for (const quantidade of Object.values(valor.chamadasPorDia)) {
    if (typeof quantidade !== "number" || !Number.isFinite(quantidade) || quantidade < 0) {
      return false
    }
  }

  return true
}

/**
 * Eu mantenho somente uma linha de controle.
 *
 * Não preciso criar várias tabelas para consultas e consumo porque este
 * estado é pequeno, pertence exclusivamente à descoberta web e já possui
 * uma estrutura estável utilizada pela aplicação.
 */
export async function buscarControleBuscaWeb(): Promise<CacheBuscas | null> {
  const resultado = await db.query<{ dados: unknown }>(`
    SELECT
      dados

    FROM controle_busca_web

    WHERE id = 1

    LIMIT 1
  `)

  const dados = resultado.rows[0]?.dados

  if (!cacheBuscaEhValido(dados)) {
    return null
  }

  return dados
}

/**
 * Eu substituo o estado completo de forma atômica no PostgreSQL.
 *
 * Isso substitui a gravação anterior em brave-buscas.json e permite que
 * o controle continue existindo mesmo quando o backend for reiniciado
 * ou publicado em uma infraestrutura com filesystem temporário.
 */
export async function salvarControleBuscaWeb(cache: CacheBuscas) {
  await db.query(
    `
      INSERT INTO controle_busca_web (
        id,
        dados
      )
      VALUES (
        1,
        $1::jsonb
      )

      ON CONFLICT (id)
      DO UPDATE SET

        dados =
          EXCLUDED.dados,

        updated_at =
          NOW()
    `,
    [JSON.stringify(cache)]
  )
}
