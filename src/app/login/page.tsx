'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

declare global { interface Window { hcaptcha: any } }

export default function LoginPage() {
  const router     = useRouter()
  const captchaRef = useRef<HTMLDivElement>(null)
  const widgetId   = useRef<string | null>(null)
  const [email,   setEmail]   = useState('')
  const [password,setPassword]= useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

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
    const captchaToken = widgetId.current !== null ? window.hcaptcha?.getResponse(widgetId.current) : 'test'
    if (!captchaToken) { setError('Please complete the captcha'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captcha: captchaToken, action: 'login' }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Login failed'); return }
      router.push('/dashboard')
    } finally {
      setLoading(false)
      if (widgetId.current !== null) window.hcaptcha?.reset(widgetId.current)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)', fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 900, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>REFRAME</Link>
        <Link href="/signup" style={{ textDecoration: 'none', fontSize: '13px', color: 'var(--muted)' }}>Create account</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontWeight: 900, fontSize: '26px', letterSpacing: '-0.02em', marginBottom: '8px' }}>Welcome back</h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Sign in to your Reframe account</p>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Email</label>
              <input className="input" type="email" required autoFocus placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Password</label>
              <input className="input" type="password" required placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div ref={captchaRef} style={{ minHeight: '78px' }} />
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', height: '48px', fontSize: '14px' }}>
              {loading ? <div className="dot-loader"><span /><span /><span /></div> : 'Sign in'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <Link href="/signup" style={{ color: 'var(--muted)', textDecoration: 'none' }}>No account? Sign up</Link>
              <Link href="/forgot" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Forgot password?</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
