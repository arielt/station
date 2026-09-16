import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPool } from './db.js'
import { readSecret } from './secrets.js'
import { clearSession, randomState, readSession, setSession, verifyPassword } from './session.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '../public')
const port = Number(process.env.PORT || 80)
const app = express()

app.use(express.urlencoded({ extended: false, limit: '32kb' }))
app.use(express.static(publicDir))

function originFrom (req) {
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/$/, '')
  }
  const proto = req.headers['x-forwarded-proto'] || 'http'
  return `${proto}://${req.get('host')}`
}

function oauthConfig () {
  return {
    googleId: readSecret('google_client_id', 'GOOGLE_CLIENT_ID'),
    googleSecret: readSecret('google_client_secret', 'GOOGLE_CLIENT_SECRET'),
    githubId: readSecret('github_client_id', 'GITHUB_CLIENT_ID'),
    githubSecret: readSecret('github_client_secret', 'GITHUB_CLIENT_SECRET')
  }
}

async function upsertUser (fields) {
  const pool = await getPool()
  const email = fields.email || null
  const existing = await pool.query(
    `SELECT * FROM users
     WHERE ($1::text IS NOT NULL AND email = $1)
        OR ($2::text IS NOT NULL AND google_id = $2)
        OR ($3::text IS NOT NULL AND github_id = $3)
     LIMIT 1`,
    [email, fields.googleId || null, fields.githubId || null]
  )
  if (existing.rows[0]) {
    const row = existing.rows[0]
    await pool.query(
      `UPDATE users SET
         email = COALESCE($2, email),
         name = COALESCE($3, name),
         google_id = COALESCE($4, google_id),
         github_id = COALESCE($5, github_id),
         updated_at = now()
       WHERE id = $1`,
      [row.id, email, fields.name || null, fields.googleId || null, fields.githubId || null]
    )
    return { ...row, email: email || row.email, name: fields.name || row.name }
  }
  const inserted = await pool.query(
    `INSERT INTO users (email, name, google_id, github_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [email, fields.name || null, fields.googleId || null, fields.githubId || null]
  )
  return inserted.rows[0]
}

function signedInPage (session) {
  const name = session.name || session.email || 'there'
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Signed in</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="login-page">
    <div class="overlay">
      <section class="dialog" role="status">
        <h1>You’re signed in</h1>
        <p class="muted">Welcome, ${escapeHtml(name)}.</p>
        <a class="btn btn-primary" href="/logout">Log out</a>
      </section>
    </div>
  </body>
</html>`
}

function escapeHtml (value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

app.get('/', (req, res) => {
  const session = readSession(req)
  if (session?.id) {
    res.type('html').send(signedInPage(session))
    return
  }
  res.redirect('/login')
})

app.get('/login', (req, res) => {
  if (readSession(req)?.id) {
    res.redirect('/')
    return
  }
  res.sendFile(path.join(publicDir, 'login.html'))
})

app.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!email || !password) {
    res.redirect('/login?error=Enter%20an%20email%20and%20password.')
    return
  }
  try {
    const pool = await getPool()
    const found = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
    const user = found.rows[0]
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.redirect('/login?error=Invalid%20email%20or%20password.')
      return
    }
    setSession(res, { id: user.id, email: user.email, name: user.name })
    res.redirect('/')
  } catch {
    res.redirect('/login?error=Sign-in%20is%20temporarily%20unavailable.')
  }
})

app.get('/auth/google', (req, res) => {
  const { googleId } = oauthConfig()
  if (!googleId) {
    res.redirect('/login?error=Google%20sign-in%20is%20not%20configured.')
    return
  }
  const state = randomState()
  res.append('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`)
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', googleId)
  url.searchParams.set('redirect_uri', `${originFrom(req)}/auth/google/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  res.redirect(url)
})

app.get('/auth/github', (req, res) => {
  const { githubId } = oauthConfig()
  if (!githubId) {
    res.redirect('/login?error=GitHub%20sign-in%20is%20not%20configured.')
    return
  }
  const state = randomState()
  res.append('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`)
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', githubId)
  url.searchParams.set('redirect_uri', `${originFrom(req)}/auth/github/callback`)
  url.searchParams.set('scope', 'user:email')
  url.searchParams.set('state', state)
  res.redirect(url)
})

function stateFromCookie (req) {
  const header = req.headers.cookie || ''
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith('oauth_state='))
  return match ? decodeURIComponent(match.slice('oauth_state='.length)) : ''
}

app.get('/auth/google/callback', async (req, res) => {
  const { googleId, googleSecret } = oauthConfig()
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''
  if (!code || !googleId || !googleSecret || state !== stateFromCookie(req)) {
    res.redirect('/login?error=Google%20sign-in%20failed.')
    return
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleId,
        client_secret: googleSecret,
        redirect_uri: `${originFrom(req)}/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    })
    const token = await tokenRes.json()
    if (!token.access_token) {
      throw new Error('no token')
    }
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    })
    const profile = await profileRes.json()
    const user = await upsertUser({
      email: profile.email,
      name: profile.name,
      googleId: profile.sub
    })
    setSession(res, { id: user.id, email: user.email, name: user.name })
    res.redirect('/')
  } catch {
    res.redirect('/login?error=Google%20sign-in%20failed.')
  }
})

app.get('/auth/github/callback', async (req, res) => {
  const { githubId, githubSecret } = oauthConfig()
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''
  if (!code || !githubId || !githubSecret || state !== stateFromCookie(req)) {
    res.redirect('/login?error=GitHub%20sign-in%20failed.')
    return
  }
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: githubId,
        client_secret: githubSecret,
        code,
        redirect_uri: `${originFrom(req)}/auth/github/callback`
      })
    })
    const token = await tokenRes.json()
    if (!token.access_token) {
      throw new Error('no token')
    }
    const profileRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'User-Agent': 'station-login',
        Accept: 'application/json'
      }
    })
    const profile = await profileRes.json()
    let email = profile.email
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'User-Agent': 'station-login',
          Accept: 'application/json'
        }
      })
      const emails = await emailsRes.json()
      email = Array.isArray(emails) ? emails.find((item) => item.primary)?.email : ''
    }
    const user = await upsertUser({
      email,
      name: profile.name || profile.login,
      githubId: String(profile.id)
    })
    setSession(res, { id: user.id, email: user.email, name: user.name })
    res.redirect('/')
  } catch {
    res.redirect('/login?error=GitHub%20sign-in%20failed.')
  }
})

app.get('/logout', (req, res) => {
  clearSession(res)
  res.redirect('/login')
})

app.listen(port, () => {
  console.log(`login listening on port ${port}`)
})
