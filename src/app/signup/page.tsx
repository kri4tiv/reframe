'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

declare global {
  interface Window { hcaptcha: any }
}

export default function SignupPage() {
  const router   = useRouter()
  const captchaRef = useRef<HTMLDivElement>(null)
  const widgetId   = useRef<string | null>(null)

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src   = 'https://js.hcaptcha.com/1/api.js'
    script.async = true
    script.defer = true
    script.onload = () => {
      if (captchaRef.current && window.hcaptcha) {
        widgetId.current = window.hcaptcha.render(captchaRef.current, {
          sitekey: process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001',
          theme: 'light',
        })
      }
    }
    document.head.appendChild(script)
    return () => { try { document.head.removeChild(script) } catch {} }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }

    const captchaToken = widgetId.current !== null
      ? window.hcaptcha?.getResponse(widgetId.current)
      : 'test'

    if (!captchaToken) { setError('Please complete the captcha'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captcha: captchaToken, action: 'signup' }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Signup failed'); return }
      setDone(true)
    } finally {
      setLoading(false)
      if (widgetId.current !== null) window.hcaptcha?.reset(widgetId.current)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)', fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column' }}>

      <nav style={{ padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 900, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>REFRAME</Link>
        <Link href="/login" style={{ textDecoration: 'none', fontSize: '13px', color: 'var(--muted)' }}>Sign in instead</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {done ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#38A169" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h2 style={{ fontWeight: 900, fontSize: '20px', marginBottom: '10px' }}>Check your email</h2>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                We sent a verification link to <strong>{email}</strong>. Click it to activate your account.
              </p>
              <Link href="/login"><button className="btn btn-primary" style={{ width: '100%' }}>Go to sign in</button></Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontWeight: 900, fontSize: '26px', letterSpacing: '-0.02em', marginBottom: '8px' }}>Create account</h1>
                <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Free to start. 3 generations on us.</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Email</label>
                  <input className="input" type="email" required autoFocus placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Password</label>
                  <input className="input" type="password" required placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Confirm password</label>
                  <input className="input" type="password" required placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} />
                </div>

                {/* hCaptcha widget */}
                <div ref={captchaRef} style={{ minHeight: '78px' }} />

                {error && <p className="error-text">{error}</p>}

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', height: '48px', fontSize: '14px' }}>
                  {loading ? (
                    <div className="dot-loader"><span /><span /><span /></div>
                  ) : 'Create account'}
                </button>

                <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6 }}>
                  By signing up you agree to our{' '}
                  <Link href="/terms" style={{ color: 'var(--ink)' }}>Terms</Link> and{' '}
                  <Link href="/privacy" style={{ color: 'var(--ink)' }}>Privacy Policy</Link>.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
