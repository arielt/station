const label = document.getElementById('vault-status')
const dot = document.querySelector('.statusbar-dot')
const addButton = document.getElementById('add-button')
const addDialog = document.getElementById('add-dialog')
const addForm = document.getElementById('add-form')
const addConnector = document.getElementById('add-connector')
const addName = document.getElementById('add-name')
const addUserRow = document.getElementById('add-user-row')
const addPasswordRow = document.getElementById('add-password-row')
const addUser = document.getElementById('add-user')
const addPassword = document.getElementById('add-password')
const addError = document.getElementById('add-error')
const resultDialog = document.getElementById('result-dialog')
const resultJson = document.getElementById('result-json')
const resultDialogClose = document.getElementById('result-dialog-close')

let connectors = []

const labels = {
  authenticated: 'Vault: authenticated',
  denied: 'Vault: authentication failed',
  missing_credentials: 'Vault: AppRole credentials missing',
  unreachable: 'Vault: unreachable',
  checking: 'Vault: checking authentication…'
}

function renderStatus (data) {
  const status = data?.status || 'unreachable'
  const text = labels[status] || labels.unreachable
  label.textContent = data?.detail && status !== 'authenticated'
    ? `${text} (${data.detail})`
    : text
  dot.dataset.state = status
}

async function refreshVaultStatus () {
  try {
    const response = await fetch('/api/vault-status')
    const data = await response.json()
    renderStatus(data)
  } catch (err) {
    renderStatus({
      status: 'unreachable',
      detail: err instanceof Error ? err.message : 'status request failed'
    })
  }
}

refreshVaultStatus()
setInterval(refreshVaultStatus, 10000)

function defaultName (description) {
  return description.replace(/\s+Connector$/i, '').trim()
}

function selectedConnector () {
  return connectors.find((item) => item.id === addConnector.value) || null
}

function syncAddFields () {
  const connector = selectedConnector()
  addName.value = connector ? defaultName(connector.description) : ''
  addUserRow.hidden = !connector?.user
  addPasswordRow.hidden = !connector?.password
  if (addUserRow.hidden) {
    addUser.value = ''
  }
  if (addPasswordRow.hidden) {
    addPassword.value = ''
  }
}

function setAddError (message) {
  addError.hidden = !message
  addError.textContent = message || ''
}

function fillConnectorSelect () {
  addConnector.replaceChildren()
  for (const connector of connectors) {
    const option = document.createElement('option')
    option.value = connector.id
    option.textContent = connector.description
    addConnector.append(option)
  }
}

async function loadConnectors () {
  const list = document.getElementById('connector-list')
  try {
    const response = await fetch('/api/connectors')
    const data = await response.json()
    connectors = data.connectors || []
    list.replaceChildren()
    for (const connector of connectors) {
      const row = document.createElement('tr')
      const cell = document.createElement('td')
      cell.textContent = connector.description
      row.append(cell)
      list.append(row)
    }
    fillConnectorSelect()
  } catch {
    connectors = []
    list.replaceChildren()
    fillConnectorSelect()
  }
}

async function loadHubEntries () {
  const list = document.getElementById('hub-list')
  try {
    const response = await fetch('/api/hub-entries')
    const data = await response.json()
    list.replaceChildren()
    for (const entry of data.entries || []) {
      list.append(hubRow(entry))
    }
  } catch {
    list.replaceChildren()
  }
}

function hubRow (entry) {
  const row = document.createElement('tr')
  const name = document.createElement('td')
  name.textContent = entry.name
  const last = document.createElement('td')
  last.className = 'last-connection'
  last.textContent = entry.ts || ''
  const result = document.createElement('td')
  const actions = document.createElement('td')
  const getButton = document.createElement('button')
  getButton.type = 'button'
  getButton.className = 'row-action'
  getButton.textContent = 'Get'
  getButton.addEventListener('click', () => runHubGet(entry.name, last, result, getButton))
  actions.append(getButton)
  row.append(name, last, result, actions)
  fillResultCell(result, entry.result)
  return row
}

function jsonText (value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function truncateJson (value, max = 48) {
  const text = jsonText(value)
  if (text.length <= max) {
    return text
  }
  return `${text.slice(0, max - 1)}…`
}

function fillResultCell (cell, result) {
  cell.replaceChildren()
  const text = jsonText(result)
  if (!text) {
    return
  }

  const wrap = document.createElement('div')
  wrap.className = 'result-cell'
  const preview = document.createElement('code')
  preview.className = 'result-preview'
  preview.textContent = truncateJson(result)
  preview.title = text
  const viewButton = document.createElement('button')
  viewButton.type = 'button'
  viewButton.className = 'row-action'
  viewButton.textContent = '...'
  viewButton.addEventListener('click', () => showResultDialog(result))
  wrap.append(preview, viewButton)
  cell.append(wrap)
}

function showResultDialog (result) {
  try {
    resultJson.textContent = typeof result === 'string'
      ? result
      : JSON.stringify(result, null, 2)
  } catch {
    resultJson.textContent = String(result)
  }
  resultDialog.showModal()
}

async function runHubGet (name, lastCell, resultCell, button) {
  button.disabled = true
  try {
    const response = await fetch('/api/hub-entries/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || 'Get failed.')
    }
    lastCell.textContent = data.ts || ''
    fillResultCell(resultCell, data.result)
  } catch (err) {
    fillResultCell(resultCell, null)
    resultCell.textContent = err instanceof Error ? err.message : 'Get failed.'
  } finally {
    button.disabled = false
  }
}

resultDialogClose.addEventListener('click', () => {
  resultDialog.close()
})

addButton.addEventListener('click', () => {
  setAddError('')
  addForm.reset()
  fillConnectorSelect()
  syncAddFields()
  addDialog.showModal()
})

addConnector.addEventListener('change', syncAddFields)

addForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const connector = selectedConnector()
  const name = addName.value.trim()
  if (!name) {
    setAddError('Name is required.')
    return
  }

  const payload = { name }
  if (connector?.id) {
    payload.connector = connector.id
  }
  if (connector?.user) {
    payload.user = addUser.value
  }
  if (connector?.password) {
    payload.password = addPassword.value
  }

  setAddError('')
  try {
    const response = await fetch('/api/hub-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save.')
    }
    addDialog.close()
    loadHubEntries()
  } catch (err) {
    setAddError(err instanceof Error ? err.message : 'Failed to save.')
  }
})

loadConnectors()
loadHubEntries()
