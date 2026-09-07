import fs from 'node:fs/promises'
import path from 'node:path'

function readDescription (text) {
  for (const raw of text.split('\n')) {
    const match = raw.trim().match(/^description:\s*(.*)$/)
    if (!match) {
      continue
    }
    let value = match[1].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    return value
  }
  return ''
}

export async function listConnectors (dir) {
  let names = []
  try {
    names = await fs.readdir(dir)
  } catch {
    return []
  }

  const connectors = []
  for (const file of names.sort()) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) {
      continue
    }
    const text = await fs.readFile(path.join(dir, file), 'utf8')
    const description = readDescription(text)
    if (!description) {
      continue
    }
    connectors.push({
      id: path.parse(file).name,
      description
    })
  }
  return connectors
}
