import { pathToFileURL } from 'node:url'
import path from 'node:path'

const DEFAULT_BASE_URL = 'https://api.wellsfargo.com'

function trimBaseUrl (value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/$/, '')
}

function basicAuth (user, password) {
  return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`
}

async function readJson (response) {
  return response.json().catch(() => ({}))
}

function logWellsFargoCall (fetchFn, label, url, status, data) {
  if (fetchFn !== globalThis.fetch) {
    return
  }
  const printable = data && typeof data === 'object'
    ? { ...data, access_token: data.access_token ? '[redacted]' : data.access_token }
    : data
  console.log(`${label} ${url}`)
  console.log(`status ${status}`)
  console.log(JSON.stringify(printable, null, 2))
}

async function requestAccessToken (params, fetchFn, baseUrl) {
  if (params.accessToken) {
    return params.accessToken
  }

  const user = params.user || params.clientId
  const password = params.password || params.clientSecret
  if (!user || !password) {
    throw new Error('accessToken or user and password are required')
  }

  const tokenUrl = params.tokenUrl || `${baseUrl}/oauth2/token`
  const response = await fetchFn(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(user, password),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: params.scope || 'accounts:read'
    }),
    signal: AbortSignal.timeout(15000)
  })
  const data = await readJson(response)
  logWellsFargoCall(fetchFn, 'Wells Fargo token', tokenUrl, response.status, data)
  if (!response.ok || !data.access_token) {
    const detail = data.error_description || data.error || `HTTP ${response.status}`
    throw new Error(`Wells Fargo token request failed: ${detail}`)
  }
  return data.access_token
}

function balanceHeaders (params, token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'client-request-id': params.requestId || crypto.randomUUID()
  }
  if (params.gatewayEntityId) {
    headers['gateway-entity-id'] = params.gatewayEntityId
  }
  return headers
}

/**
 * Call Wells Fargo Account Balance API v2.
 * @see https://developer.wellsfargo.com/documentation/api-references/account-balance/v2/account-balance-api-ref-v2
 */
export async function get (params = {}, deps = {}) {
  const fetchFn = deps.fetch || globalThis.fetch
  const ts = new Date().toISOString()
  const baseUrl = trimBaseUrl(params.baseUrl)
  const accountId = params.accountId || params.accountNumber
  if (!accountId) {
    throw new Error('accountId is required')
  }

  const token = await requestAccessToken(params, fetchFn, baseUrl)
  const url = new URL(
    `${baseUrl}/account-balance/v2/accounts/${encodeURIComponent(accountId)}/balances`
  )
  if (params.asOfDate) {
    url.searchParams.set('asOfDate', params.asOfDate)
  }

  const response = await fetchFn(url, {
    method: 'GET',
    headers: balanceHeaders(params, token),
    signal: AbortSignal.timeout(15000)
  })
  const body = await readJson(response)
  logWellsFargoCall(fetchFn, 'Wells Fargo account balance', url, response.status, body)
  const payload = body && typeof body === 'object' && !Array.isArray(body)
    ? body
    : { body }

  return {
    ...payload,
    status: response.status,
    ts
  }
}

const isCli = process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isCli) {
  const raw = process.argv[2] || '{}'
  get(JSON.parse(raw))
    .then((result) => {
      console.log('result')
      console.log(JSON.stringify(result, null, 2))
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err)
      process.exit(1)
    })
}
