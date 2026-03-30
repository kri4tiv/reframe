import crypto from 'crypto'

// ─── API Key Encryption ─────────────────────────────────────────────
const ALGO = 'aes-256-gcm'
const KEY  = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('base64'), 'base64')

export function encryptApiKey(plaintext: string): string {
  const iv        = crypto.randomBytes(16)
  const cipher    = crypto.createCipheriv(ALGO, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag       = cipher.getAuthTag()
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decryptApiKey(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':')
  const iv       = Buffer.from(ivHex, 'hex')
  const tag      = Buffer.from(tagHex, 'hex')
  const data     = Buffer.from(dataHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

// ─── Browser Fingerprint (server-side, from headers) ───────────────
export function getFingerprint(req: Request): string {
  const ua      = req.headers.get('user-agent') || ''
  const lang    = req.headers.get('accept-language') || ''
  const forward = req.headers.get('x-forwarded-for') || ''
  const ip      = forward.split(',')[0].trim()
  return crypto
    .createHash('sha256')
    .update(`${ip}:${ua}:${lang}`)
    .digest('hex')
    .slice(0, 32)
}

// ─── In-memory rate limiter (per fingerprint) ──────────────────────
const rateLimitMap = new Map<string, { count: number; reset: number }>()

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now   = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.reset) {
    rateLimitMap.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

// ─── Input sanitisation ────────────────────────────────────────────
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().slice(0, 254)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

export function isValidApiKey(key: string): boolean {
  // Gemini keys start with "AI" and are ~39 chars
  return /^AI[a-zA-Z0-9_-]{30,60}$/.test(key.trim())
}

// ─── CSRF-safe response helpers ────────────────────────────────────
export function jsonOk<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status })
}

export function jsonErr(error: string, status = 400) {
  return Response.json({ success: false, error }, { status })
}
