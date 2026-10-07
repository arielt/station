import fs from 'node:fs'
import path from 'node:path'

const vaultAddr = (process.env.VAULT_ADDR || 'http://vault:8200').replace(/\/$/, '')
const secretsDir = process.env.SECRETS_DIR || '/run/secrets'
const hubSecretPath = 'secret/data/approles/app'

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

async function loginWithAppRole () {
  const roleId = readCredential('VAULT_ROLE_ID', 'approle_role_id')
  const secretId = readCredential('VAULT_SECRET_ID', 'approle_secret_id')

  if (!roleId || !secretId) {
    const err = new Error('AppRole role_id or secret_id is not available.')
    err.status = 'missing_credentials'
    throw err
  }

  const response = await fetch(`${vaultAddr}/v1/auth/approle/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role_id: roleId, secret_id: secretId }),
    signal: AbortSignal.timeout(5000)
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const errors = Array.isArray(data.errors) ? data.errors.join(', ') : ''
    const err = new Error(errors || `HTTP ${response.status}`)
    err.status = 'denied'
    throw err
  }

  const token = data.auth?.client_token
  if (!token) {
    const err = new Error('Vault login did not return a token.')
    err.status = 'denied'
    throw err
  }
  return { token, auth: data.auth }
}

export async function getVaultAuthStatus () {
  try {
    const { auth } = await loginWithAppRole()
    return {
      authenticated: true,
      status: 'authenticated',
      vaultAddr,
      policies: auth.policies || [],
      leaseDuration: auth.lease_duration ?? null
    }
  } catch (err) {
    const status = err.status || 'unreachable'
    return {
      authenticated: false,
      status,
      vaultAddr,
      detail: err instanceof Error ? err.message : 'Vault is unreachable.'
    }
  }
}

async function readHubEntries (token) {
  const response = await fetch(`${vaultAddr}/v1/${hubSecretPath}`, {
    headers: { 'X-Vault-Token': token },
    signal: AbortSignal.timeout(5000)
  })
  if (response.status === 404) {
    return {}
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const errors = Array.isArray(data.errors) ? data.errors.join(', ') : ''
    throw new Error(errors || `HTTP ${response.status}`)
  }
  return data.data?.data && typeof data.data.data === 'object'
    ? data.data.data
    : {}
}

function parseHubFields (value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...value }
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      return {}
    }
  }
  return {}
}

function hubTs (value) {
  if (typeof value === 'string' && value) {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString()
  }
  return ''
}

export async function listHubEntries () {
  const { token } = await loginWithAppRole()
  const entries = await readHubEntries(token)
  return Object.keys(entries)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const fields = parseHubFields(entries[name])
      return {
        name,
        ts: hubTs(fields.ts),
        connector: typeof fields.connector === 'string' ? fields.connector : '',
        result: fields.result ?? null
      }
    })
}

export async function getHubEntry (name) {
  const { token } = await loginWithAppRole()
  const entries = await readHubEntries(token)
  if (!Object.hasOwn(entries, name)) {
    const err = new Error('Hub entry not found.')
    err.code = 404
    throw err
  }
  return parseHubFields(entries[name])
}

export async function writeHubEntry (name, fields) {
  const { token } = await loginWithAppRole()
  const existing = await readHubEntries(token)
  const next = {
    ...existing,
    [name]: fields
  }

  const response = await fetch(`${vaultAddr}/v1/${hubSecretPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Vault-Token': token
    },
    body: JSON.stringify({ data: next }),
    signal: AbortSignal.timeout(5000)
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const errors = Array.isArray(data.errors) ? data.errors.join(', ') : ''
    throw new Error(errors || `HTTP ${response.status}`)
  }
  return { name }
}
