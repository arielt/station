import { getPool } from './db.js'

const pool = await getPool()
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    password_hash text,
    google_id text UNIQUE,
    github_id text UNIQUE,
    name text,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`)
await pool.end()
