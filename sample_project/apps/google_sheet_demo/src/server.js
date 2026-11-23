import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readSheet } from './sheet.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 80)
const app = express()

app.use(express.json({ limit: '32kb' }))
app.use(express.static(path.join(__dirname, '../public')))

app.post('/api/sheet', async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url : ''
  if (!url.trim()) {
    res.status(400).json({ error: 'Paste a Google Sheet URL first.' })
    return
  }

  try {
    const { rows } = await readSheet(url)
    res.json({ rows })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read the sheet.'
    const status = message.startsWith('Could not read') ? 502 : 400
    res.status(status).json({ error: message })
  }
})

app.listen(port, () => {
  console.log(`google-sheet-demo listening on port ${port}`)
})
