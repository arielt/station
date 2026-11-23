import fs from 'node:fs'
import path from 'node:path'

const secretsDir = process.env.SECRETS_DIR || '/run/secrets'

export function readSecret (name, envName = '') {
  const envKey = envName || name.toUpperCase()
  const fromEnv = process.env[envKey]
  if (fromEnv) {
    return fromEnv.trim()
  }
  try {
    return fs.readFileSync(path.join(secretsDir, name), 'utf8').trim()
  } catch {
    return ''
  }
}
