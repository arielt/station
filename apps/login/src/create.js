import { getPool } from './db.js'

const pool = await getPool()
await pool.query('SELECT 1')
await pool.end()
