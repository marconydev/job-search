import "dotenv/config"

import pg from "pg"

const { Pool } = pg

const databaseUrl = process.env.DATABASE_URL?.trim()

/**
 * Em produção eu posso usar uma única DATABASE_URL, como a fornecida
 * pelo Neon.
 *
 * Localmente continuo aceitando as variáveis separadas que já utilizo,
 * portanto não preciso mudar meu ambiente de desenvolvimento.
 */
export const db = databaseUrl
  ? new Pool({
      connectionString: databaseUrl
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    })
