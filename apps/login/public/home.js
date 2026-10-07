const icons = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.2 22V13.2h5.6V22h7V10.4L12 2 2.2 10.4V22z"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" d="m16 16 5 5"/></svg>',
  explore: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path fill="currentColor" d="m8.2 15.8 2.2-6.4 6.4-2.2-2.2 6.4z"/></svg>',
  reels: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><path fill="currentColor" d="M10 8.8v6.4l5.4-3.2z"/><path fill="none" stroke="currentColor" stroke-width="2" d="M3 8.5h18"/></svg>',
  messages: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M21 11.5a8.5 8.5 0 0 1-12.8 7.4L3 21l2.2-5A8.5 8.5 0 1 1 21 11.5z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M12 20s-7.2-4.4-9-8.4C1.6 8.4 3.2 5 6.6 5 8.7 5 10.2 6.2 12 8c1.8-1.8 3.3-3 5.4-3 3.4 0 5 3.4 3.6 6.6-1.8 4-9 8.4-9 8.4z"/></svg>',
  create: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" d="M12 8v8M8 12h8"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M4 7h16M4 12h16M4 17h16"/></svg>',
  comment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.6L4 21l1.8-4.2A8.5 8.5 0 1 1 20.5 11.5z"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M22 3 9.5 13M22 3l-7 19-4.5-9L3 9z"/></svg>',
  save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M6 4h12v16l-6-3.5L6 20z"/></svg>'
}

function paintIcons (root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const svg = icons[el.dataset.icon]
    if (svg && !el.querySelector('svg')) {
      el.insertAdjacentHTML('afterbegin', svg)
    }
  })
  root.querySelectorAll('.like').forEach((el) => {
    if (!el.querySelector('svg')) {
      el.insertAdjacentHTML('afterbegin', icons.heart)
    }
  })
}

paintIcons()

document.querySelectorAll('.like').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('is-on')
    btn.setAttribute('aria-pressed', btn.classList.contains('is-on') ? 'true' : 'false')
  })
})

document.querySelectorAll('.suggest-list button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const on = btn.classList.toggle('is-on')
    btn.textContent = on ? 'Following' : 'Follow'
  })
})

const moreToggle = document.querySelector('.more-toggle')
const moreMenu = document.getElementById('more-menu')
if (moreToggle && moreMenu) {
  moreToggle.addEventListener('click', () => {
    const open = moreMenu.hidden
    moreMenu.hidden = !open
    moreToggle.setAttribute('aria-expanded', open ? 'true' : 'false')
  })
}

const ftue = document.getElementById('ftue')
const continueBtn = document.getElementById('ftue-continue')
if (document.body.dataset.firstLogin === 'true' && ftue) {
  ftue.hidden = false
}

async function dismissFtue () {
  if (!ftue || ftue.hidden) {
    return
  }
  ftue.hidden = true
  try {
    await fetch('/api/ftue-dismiss', { method: 'POST' })
  } catch {
    // Ignore dismiss failures; the dialog is already closed.
  }
}

continueBtn?.addEventListener('click', dismissFtue)
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    dismissFtue()
  }
})
