'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError('')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) { setError(error.message); return }
        setDone(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError('Invalid email or password'); return }
        router.push('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--paper)' }}>
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 900, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>REFRAME</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h2 style={{ fontWeight: 900, fontSize: '20px', marginBottom: '10px' }}>Check your email</h2>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '24px' }}>We sent a link to <strong>{email}</strong>. Click it to activate your account.</p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setDone(false)}>Back to sign in</button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontWeight: 900, fontSize: '24px', letterSpacing: '-0.02em', marginBottom: '6px' }}>
                  {mode === 'login' ? 'Welcome back' : 'Create account'}
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {mode === 'login' ? 'Sign in to your Reframe account' : '3 free generations on us'}
                </p>
              </div>

              {/* Google button */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                style={{ width: '100%', height: '46px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600, fontSize: '14px', color: 'var(--ink)', transition: 'border-color 0.15s', marginBottom: '20px' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--ink)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {googleLoading ? (
                  <div className="dot-loader"><span /><span /><span /></div>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Email</label>
                  <input className="input" type="email" required placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Password</label>
                  <input className="input" type="password" required placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                {error && <p className="error-text">{error}</p>}
                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', height: '46px' }}>
                  {loading ? <div className="dot-loader"><span /><span /><span /></div> : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              {/* Toggle */}
              <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--muted)' }}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} style={{ background: 'none', border: 'none', color: 'var(--ink)', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '13px' }}>
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
