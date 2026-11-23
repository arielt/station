import { readSecret } from './secrets.js'

const vaultAddr = (process.env.VAULT_ADDR || 'http://vault:8200').replace(/\/$/, '')

async function loginWithAppRole () {
  const roleId = readSecret('approle_role_id', 'VAULT_ROLE_ID')
  const secretId = readSecret('approle_secret_id', 'VAULT_SECRET_ID')
  if (!roleId || !secretId) {
    return ''
  }

  const response = await fetch(`${vaultAddr}/v1/auth/approle/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role_id: roleId, secret_id: secretId }),
    signal: AbortSignal.timeout(5000)
  })
  const data = await response.json().catch(() => ({}))
  return data.auth?.client_token || ''
}

export async function readVaultField (secretPath, field) {
  const token = await loginWithAppRole()
  if (!token) {
    return ''
  }
  const response = await fetch(`${vaultAddr}/v1/${secretPath}`, {
    headers: { 'X-Vault-Token': token },
    signal: AbortSignal.timeout(5000)
  })
  const data = await response.json().catch(() => ({}))
  const value = data.data?.data?.[field]
  return typeof value === 'string' ? value.trim() : ''
}

export async function postgresPassword () {
  return readSecret('postgres_passwd', 'PGPASSWORD') ||
    readSecret('postgres_password', 'POSTGRES_PASSWORD') ||
    await readVaultField('secret/data/platform/db', 'postgres_passwd')
}
