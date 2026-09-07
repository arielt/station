import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { listConnectors } from './connectors.js'
import { getVaultAuthStatus } from './vault.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const connectorsDir = path.join(__dirname, 'connectors')
const port = Number(process.env.PORT || 80)
const app = express()

app.use(express.static(path.join(__dirname, '../public')))

app.get('/api/connectors', async (_req, res) => {
  const connectors = await listConnectors(connectorsDir)
  res.json({ connectors })
})

app.get('/api/vault-status', async (_req, res) => {
  const status = await getVaultAuthStatus()
  res.json(status)
})

app.listen(port, () => {
  console.log(`connector listening on port ${port}`)
})
