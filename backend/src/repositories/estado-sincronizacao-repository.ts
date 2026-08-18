import { db } from "../database/connection.js"

export type SituacaoSincronizacao =
  "ociosa" | "executando" | "concluida" | "falhou" | "interrompida"

export type ModoExecucaoSincronizacao = "economico" | "brave"

export type EstadoSincronizacao = {
  id: string | null

  estado: SituacaoSincronizacao

  modo: ModoExecucaoSincronizacao | null

  etapa: string | null

  mensagem: string | null

  resultado: unknown | null

  iniciadoEm: string | null

  heartbeatEm: string | null

  concluidoEm: string | null
}

type LinhaEstadoSincronizacao = {
  execucao_id: string | null

  estado: SituacaoSincronizacao

  modo: ModoExecucaoSincronizacao | null

  etapa: string | null

  mensagem: string | null

  resultado: unknown | null

  iniciado_em: string | null

  heartbeat_em: string | null

  concluido_em: string | null
}

function mapearEstado(linha: LinhaEstadoSincronizacao): EstadoSincronizacao {
  return {
    id: linha.execucao_id,

    estado: linha.estado,

    modo: linha.modo,

    etapa: linha.etapa,

    mensagem: linha.mensagem,

    resultado: linha.resultado,

    iniciadoEm: linha.iniciado_em,

    heartbeatEm: linha.heartbeat_em,

    concluidoEm: linha.concluido_em
  }
}

/**
 * Eu considero uma execução interrompida quando o processo deixou de
 * atualizar o heartbeat por mais de dois minutos.
 *
 * Enquanto a aplicação estiver realmente trabalhando, o serviço em
 * segundo plano atualiza esse horário periodicamente.
 */
async function marcarExecucaoInterrompidaSeExpirada() {
  await db.query(`
    UPDATE estado_sincronizacao

    SET
      estado = 'interrompida',

      mensagem =
        'A sincronização foi interrompida antes de concluir. Ela pode ser iniciada novamente com segurança.',

      concluido_em = NOW(),

      updated_at = NOW()

    WHERE
      id = 1

      AND estado = 'executando'

      AND (
        heartbeat_em IS NULL
        OR heartbeat_em < NOW() - INTERVAL '2 minutes'
      )
  `)
}

export async function obterEstadoSincronizacao(): Promise<EstadoSincronizacao> {
  await marcarExecucaoInterrompidaSeExpirada()

  const resultado = await db.query<LinhaEstadoSincronizacao>(`
      SELECT
        execucao_id,
        estado,
        modo,
        etapa,
        mensagem,
        resultado,
        iniciado_em,
        heartbeat_em,
        concluido_em

      FROM estado_sincronizacao

      WHERE id = 1

      LIMIT 1
    `)

  const linha = resultado.rows[0]

  if (!linha) {
    throw new Error("O estado da sincronização não foi inicializado no banco.")
  }

  return mapearEstado(linha)
}

/**
 * A própria atualização no PostgreSQL funciona como uma trava.
 *
 * Mesmo que duas requisições tentem iniciar ao mesmo tempo, somente uma
 * consegue alterar o registro quando o estado não está "executando".
 */
export async function tentarIniciarSincronizacao(
  execucaoId: string,
  modo: ModoExecucaoSincronizacao
): Promise<EstadoSincronizacao | null> {
  await marcarExecucaoInterrompidaSeExpirada()

  const resultado = await db.query<LinhaEstadoSincronizacao>(
    `
        UPDATE estado_sincronizacao

        SET
          execucao_id = $1::uuid,

          estado = 'executando',

          modo = $2,

          etapa = 'iniciando',

          mensagem = 'Sincronização iniciada.',

          resultado = NULL,

          iniciado_em = NOW(),

          heartbeat_em = NOW(),

          concluido_em = NULL,

          updated_at = NOW()

        WHERE
          id = 1

          AND estado <> 'executando'

        RETURNING
          execucao_id,
          estado,
          modo,
          etapa,
          mensagem,
          resultado,
          iniciado_em,
          heartbeat_em,
          concluido_em
      `,
    [execucaoId, modo]
  )

  const linha = resultado.rows[0]

  return linha ? mapearEstado(linha) : null
}

export async function atualizarHeartbeatSincronizacao(execucaoId: string, etapa?: string) {
  await db.query(
    `
      UPDATE estado_sincronizacao

      SET
        heartbeat_em = NOW(),

        etapa =
          COALESCE(
            $2,
            etapa
          ),

        updated_at = NOW()

      WHERE
        id = 1

        AND execucao_id = $1::uuid

        AND estado = 'executando'
    `,
    [execucaoId, etapa ?? null]
  )
}

export async function concluirSincronizacao(execucaoId: string, resultadoSincronizacao: unknown) {
  await db.query(
    `
      UPDATE estado_sincronizacao

      SET
        estado = 'concluida',

        etapa = 'concluida',

        mensagem =
          'Sincronização concluída com sucesso.',

        resultado = $2::jsonb,

        heartbeat_em = NOW(),

        concluido_em = NOW(),

        updated_at = NOW()

      WHERE
        id = 1

        AND execucao_id = $1::uuid

        AND estado = 'executando'
    `,
    [execucaoId, JSON.stringify(resultadoSincronizacao)]
  )
}

export async function falharSincronizacao(execucaoId: string, mensagem: string) {
  await db.query(
    `
      UPDATE estado_sincronizacao

      SET
        estado = 'falhou',

        mensagem =
          LEFT(
            $2,
            2000
          ),

        heartbeat_em = NOW(),

        concluido_em = NOW(),

        updated_at = NOW()

      WHERE
        id = 1

        AND execucao_id = $1::uuid

        AND estado = 'executando'
    `,
    [execucaoId, mensagem]
  )
}
