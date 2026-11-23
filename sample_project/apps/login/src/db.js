import pg from 'pg'
import { postgresPassword } from './vault.js'

let pool

export async function getPool () {
  if (pool) {
    return pool
  }
  const password = await postgresPassword()
  if (!password) {
    throw new Error('Postgres password is not available.')
  }
  pool = new pg.Pool({
    host: process.env.PGHOST || 'db',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    database: process.env.PGDATABASE || 'postgres',
    password,
    max: 5
  })
  return pool
}
