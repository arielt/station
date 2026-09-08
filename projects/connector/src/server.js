import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { listConnectors } from './connectors.js'
import { getVaultAuthStatus, listHubEntries, writeHubEntry } from './vault.js'

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
    const names = await listHubEntries()
    res.json({ entries: names.map((name) => ({ name })) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read vault.'
    res.status(502).json({ error: message })
  }
})

app.post('/api/hub-entries', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (!name) {
    res.status(400).json({ error: 'Name is required.' })
    return
  }

  const fields = {}
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
