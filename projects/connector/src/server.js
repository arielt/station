import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { callConnectorGet, listConnectors } from './connectors.js'
import { getHubEntry, getVaultAuthStatus, listHubEntries, writeHubEntry } from './vault.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const connectorsDir = path.join(__dirname, 'connectors')
const port = Number(process.env.PORT || 80)
const app = express()

app.use(express.json({ limit: '32kb' }))
app.use(express.static(path.join(__dirname, '../public')))

app.get('/api/connectors', async (_req, res) => {
  const connectors = await listConnectors(connectorsDir)
  res.json({ connectors })
})

app.get('/api/vault-status', async (_req, res) => {
  const status = await getVaultAuthStatus()
  res.json(status)
})

app.get('/api/hub-entries', async (_req, res) => {
  try {
    const entries = await listHubEntries()
    res.json({ entries })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read vault.'
    res.status(502).json({ error: message })
  }
})

function defaultConnectorName (description) {
  return description.replace(/\s+Connector$/i, '').trim()
}

function resolveConnectorId (name, fields, connectors) {
  if (typeof fields.connector === 'string' && fields.connector.trim()) {
    return fields.connector.trim()
  }
  const match = connectors.find((connector) => {
    return connector.id === name || defaultConnectorName(connector.description) === name
  })
  return match?.id || ''
}

function asTimestamp (value) {
  if (typeof value === 'string' && value.trim()) {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString()
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }
  return ''
}

app.post('/api/hub-entries/get', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (!name) {
    res.status(400).json({ error: 'Name is required.' })
    return
  }

  try {
    const fields = await getHubEntry(name)
    const connectors = await listConnectors(connectorsDir)
    const connectorId = resolveConnectorId(name, fields, connectors)
    const result = await callConnectorGet(connectorsDir, connectorId)
    const ts = asTimestamp(result?.ts)
    if (!ts) {
      res.status(502).json({ error: 'Get handler did not return a timestamp.' })
      return
    }
    await writeHubEntry(name, { ...fields, connector: connectorId, ts, result })
    res.json({ ts, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get connector data.'
    const status = err.code === 404 ? 404 : 502
    res.status(status).json({ error: message })
  }
})

app.post('/api/hub-entries', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (!name) {
    res.status(400).json({ error: 'Name is required.' })
    return
  }

  const fields = {}
  if (typeof req.body?.connector === 'string' && req.body.connector.trim()) {
    fields.connector = req.body.connector.trim()
  }
  if (Object.hasOwn(req.body, 'user')) {
    fields.user = typeof req.body.user === 'string' ? req.body.user : ''
  }
  if (Object.hasOwn(req.body, 'password')) {
    fields.password = typeof req.body.password === 'string' ? req.body.password : ''
  }

  try {
    await writeHubEntry(name, fields)
    res.json({ ok: true, name })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to write to vault.'
    res.status(502).json({ error: message })
  }
})

app.listen(port, () => {
  console.log(`connector listening on port ${port}`)
})
