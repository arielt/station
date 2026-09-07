import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getVaultAuthStatus } from './vault.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 80)
const app = express()

app.use(express.static(path.join(__dirname, '../public')))

app.get('/api/vault-status', async (_req, res) => {
  const status = await getVaultAuthStatus()
  res.json(status)
})

app.listen(port, () => {
  console.log(`connector listening on port ${port}`)
})
