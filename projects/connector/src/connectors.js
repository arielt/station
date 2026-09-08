import fs from 'node:fs/promises'
import path from 'node:path'

function unquote (value) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function isTrue (value) {
  return unquote(value).toLowerCase() === 'true'
}

function parseConnectorYaml (text) {
  let description = ''
  let user = false
  let password = false

  for (const raw of text.split('\n')) {
    const match = raw.trim().match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (!match) {
      continue
    }
    const [, key, value] = match
    if (key === 'description') {
      description = unquote(value)
    } else if (key === 'user') {
      user = isTrue(value)
    } else if (key === 'password') {
      password = isTrue(value)
    }
  }

  return { description, user, password }
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
    const parsed = parseConnectorYaml(text)
    if (!parsed.description) {
      continue
    }
    connectors.push({
      id: path.parse(file).name,
      description: parsed.description,
      user: parsed.user,
      password: parsed.password
    })
  }
  return connectors
}
