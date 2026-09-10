import test from 'node:test'
import assert from 'node:assert/strict'
import { get } from './wf.js'

test('get passes a parameter map to the Account Balance API v2', async () => {
  const calls = []
  const fetchFn = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    if (String(url).includes('/oauth2/token')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'wf-token' })
      }
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        accountId: 'acc-1',
        availableBalance: 100.25,
        ledgerBalance: 90.1,
        currency: 'USD'
      })
    }
  }

  const params = {
    user: 'wf-client',
    password: 'wf-secret',
    accountId: 'acc-1',
    gatewayEntityId: 'entity-1',
    requestId: 'req-1',
    baseUrl: 'https://api.wellsfargo.com'
  }

  const result = await get(params, { fetch: fetchFn })
  console.log('params', params)
  console.log('result', result)

  assert.equal(calls.length, 2)
  assert.equal(calls[0].url, 'https://api.wellsfargo.com/oauth2/token')
  assert.equal(
    calls[1].url,
    'https://api.wellsfargo.com/account-balance/v2/accounts/acc-1/balances'
  )
  assert.equal(calls[1].options.method, 'GET')
  assert.equal(calls[1].options.headers.Authorization, 'Bearer wf-token')
  assert.equal(calls[1].options.headers['gateway-entity-id'], 'entity-1')
  assert.equal(calls[1].options.headers['client-request-id'], 'req-1')
  assert.equal(result.status, 200)
  assert.equal(result.accountId, 'acc-1')
  assert.equal(result.availableBalance, 100.25)
  assert.ok(result.ts)
})
