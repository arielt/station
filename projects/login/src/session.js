import crypto from 'node:crypto'
import { readSecret } from './secrets.js'

const cookieName = 'login_session'

function sessionKey () {
  return readSecret('session_secret', 'SESSION_SECRET') || 'local-dev-session-secret'
}

function sign (value) {
  return crypto.createHmac('sha256', sessionKey()).update(value).digest('base64url')
}

export function readSession (req) {
  const header = req.headers.cookie || ''
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))
  if (!match) {
    return null
  }
  const token = decodeURIComponent(match.slice(cookieName.length + 1))
  const dot = token.lastIndexOf('.')
  if (dot < 0) {
    return null
  }
  const payload = token.slice(0, dot)
  const digest = token.slice(dot + 1)
  const expected = sign(payload)
  const a = Buffer.from(digest)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null
  }
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch {
    return null
  }
}

export function setSession (res, session) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const token = `${payload}.${sign(payload)}`
  res.append('Set-Cookie', `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`)
}

export function clearSession (res) {
  res.append('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

export function randomState () {
  return crypto.randomBytes(16).toString('hex')
}

export function hashPassword (password) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 32)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword (password, stored) {
  if (!stored || !stored.includes(':')) {
    return false
  }
  const [saltHex, hashHex] = stored.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = crypto.scryptSync(password, salt, 32)
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}
