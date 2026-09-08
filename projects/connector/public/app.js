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
      const row = document.createElement('tr')
      const name = document.createElement('td')
      name.textContent = entry.name
      row.append(name, document.createElement('td'), document.createElement('td'), document.createElement('td'))
      list.append(row)
    }
  } catch {
    list.replaceChildren()
  }
}

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
