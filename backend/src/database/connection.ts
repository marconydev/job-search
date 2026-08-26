import "dotenv/config"

import pg from "pg"

const { Pool } = pg

const databaseUrl = process.env.DATABASE_URL?.trim()

const configuracaoPool = {
  /**
   * O backend possui uma única instância pequena no Render.
   *
   * Cinco conexões são suficientes para:
   *
   * - sincronização;
   * - consultas de status;
   * - dashboard;
   * - heartbeat.
   *
   * Evito abrir conexões demais contra o PostgreSQL/Neon.
   */
  max: 5,

  /**
   * Se não for possível estabelecer conexão em dez segundos,
   * a consulta recebe erro em vez de ficar aguardando indefinidamente.
   */
  connectionTimeoutMillis: 10_000,

  /**
   * Conexões sem uso podem ser descartadas depois de trinta segundos.
   */
  idleTimeoutMillis: 30_000
}

export const db = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,

      ...configuracaoPool
    })
  : new Pool({
      host: process.env.DB_HOST,

      port: Number(process.env.DB_PORT),

      database: process.env.DB_NAME,

      user: process.env.DB_USER,

      password: process.env.DB_PASSWORD,

      ...configuracaoPool
    })

/**
 * O pg.Pool pode emitir erros em conexões que estão ociosas.
 *
 * Isso pode ocorrer por:
 *
 * - interrupção temporária de rede;
 * - reinício/failover do PostgreSQL;
 * - encerramento de uma conexão pelo provedor.
 *
 * Sem um listener para o evento "error", o Node pode tratar esse erro
 * como não capturado e encerrar todo o processo.
 *
 * O próprio Pool remove automaticamente o cliente com problema.
 * As próximas consultas poderão utilizar/criar outra conexão.
 */
db.on("error", erro => {
  console.error("PostgreSQL: erro inesperado em conexão ociosa do pool:", erro)
})
