import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { verifyCaptcha, sanitizeEmail, isValidEmail, checkRateLimit, getFingerprint, jsonOk, jsonErr } from '@/lib/security'
import { z } from 'zod'

const AuthSchema = z.object({
  email:    z.string().email().max(254),
  password: z.string().min(8).max(128),
  captcha:  z.string().min(1),
  action:   z.enum(['signup', 'login']),
})

export async function POST(req: NextRequest) {
  // Rate limit: 5 auth attempts per minute per fingerprint
  const fp = getFingerprint(req)
  if (!checkRateLimit(`auth:${fp}`, 5, 60_000)) {
    return jsonErr('Too many attempts. Please wait a minute.', 429)
  }

  try {
    const body = await req.json()
    const parsed = AuthSchema.safeParse(body)
    if (!parsed.success) return jsonErr('Invalid input', 400)

    const { action, captcha } = parsed.data
    const email    = sanitizeEmail(parsed.data.email)
    const password = parsed.data.password

    if (!isValidEmail(email)) return jsonErr('Invalid email address')

    // Verify captcha
    const captchaOk = await verifyCaptcha(captcha)
    if (!captchaOk) return jsonErr('Captcha verification failed', 400)

    const supabase = await createServerSupabase()

    if (action === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        if (error.message.includes('already registered')) return jsonErr('An account with this email already exists')
        return jsonErr(error.message)
      }
      return jsonOk({ user: data.user, message: 'Account created. Check your email to verify.' })
    }

    if (action === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        // Generic message to prevent user enumeration
        return jsonErr('Invalid email or password', 401)
      }
      return jsonOk({ user: data.user, session: data.session })
    }

    return jsonErr('Invalid action')
  } catch (err) {
    console.error('[/api/auth]', err)
    return jsonErr('Authentication failed', 500)
  }
}
