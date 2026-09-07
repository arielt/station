import fs from 'node:fs'
import path from 'node:path'

const vaultAddr = (process.env.VAULT_ADDR || 'http://vault:8200').replace(/\/$/, '')
const secretsDir = process.env.SECRETS_DIR || '/run/secrets'

function readCredential (envName, fileName) {
  const fromEnv = process.env[envName]
  if (fromEnv) {
    return fromEnv.trim()
  }
  try {
    return fs.readFileSync(path.join(secretsDir, fileName), 'utf8').trim()
  } catch {
    return ''
  }
}

export async function getVaultAuthStatus () {
  const roleId = readCredential('VAULT_ROLE_ID', 'approle_role_id')
  const secretId = readCredential('VAULT_SECRET_ID', 'approle_secret_id')

  if (!roleId || !secretId) {
    return {
      authenticated: false,
      status: 'missing_credentials',
      vaultAddr,
      detail: 'AppRole role_id or secret_id is not available.'
    }
  }

  try {
    const response = await fetch(`${vaultAddr}/v1/auth/approle/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: roleId, secret_id: secretId }),
      signal: AbortSignal.timeout(5000)
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const errors = Array.isArray(data.errors) ? data.errors.join(', ') : ''
      return {
        authenticated: false,
        status: 'denied',
        vaultAddr,
        detail: errors || `HTTP ${response.status}`
      }
    }

    const auth = data.auth || {}
    return {
      authenticated: true,
      status: 'authenticated',
      vaultAddr,
      policies: auth.policies || [],
      leaseDuration: auth.lease_duration ?? null
    }
  } catch (err) {
    return {
      authenticated: false,
      status: 'unreachable',
      vaultAddr,
      detail: err instanceof Error ? err.message : 'Vault is unreachable.'
    }
  }
}
