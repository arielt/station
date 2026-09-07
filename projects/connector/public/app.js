const label = document.getElementById('vault-status')
const dot = document.querySelector('.statusbar-dot')

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

async function loadConnectors () {
  const list = document.getElementById('connector-list')
  try {
    const response = await fetch('/api/connectors')
    const data = await response.json()
    for (const connector of data.connectors || []) {
      const row = document.createElement('tr')
      const cell = document.createElement('td')
      cell.textContent = connector.description
      row.append(cell)
      list.append(row)
    }
  } catch {
    list.replaceChildren()
  }
}

loadConnectors()
