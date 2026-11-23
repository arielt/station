const form = document.getElementById('sheet-form')
const input = document.getElementById('sheet-url')
const button = document.getElementById('load-button')
const status = document.getElementById('status')
const tableWrap = document.getElementById('table-wrap')

function setStatus (message, isError = false) {
  status.hidden = !message
  status.textContent = message
  status.classList.toggle('error', isError)
}

function renderTable (rows) {
  const [header, ...body] = rows
  const table = document.createElement('table')
  const thead = document.createElement('thead')
  const headerRow = document.createElement('tr')

  for (const value of header) {
    const th = document.createElement('th')
    th.textContent = value
    headerRow.append(th)
  }
  thead.append(headerRow)

  const tbody = document.createElement('tbody')
  for (const row of body) {
    const tr = document.createElement('tr')
    const width = Math.max(header.length, row.length)
    for (let i = 0; i < width; i++) {
      const td = document.createElement('td')
      td.textContent = row[i] ?? ''
      tr.append(td)
    }
    tbody.append(tr)
  }

  table.append(thead, tbody)
  tableWrap.replaceChildren(table)
  tableWrap.hidden = false
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  button.disabled = true
  tableWrap.hidden = true
  tableWrap.replaceChildren()
  setStatus('Reading sheet…')

  try {
    const response = await fetch('/api/sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: input.value })
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to read the sheet.')
    }
    renderTable(data.rows)
    setStatus(`${data.rows.length} row${data.rows.length === 1 ? '' : 's'} loaded.`)
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Failed to read the sheet.', true)
  } finally {
    button.disabled = false
  }
})
