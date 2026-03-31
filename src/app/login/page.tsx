'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
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
    try {
      const supabase = createClient()
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      })
      if (error) { setError(error.message); setGoogleLoading(false) }
    } catch (e) {
      setError('Google sign in failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
        })
        if (error) {
          if (error.message.includes('already registered')) {
            setError('An account with this email already exists. Sign in instead.')
          } else {
            setError(error.message)
          }
          return
        }
        // If session exists, email confirmation is disabled — go straight to dashboard
        if (data.session) {
          window.location.href = '/dashboard'
          return
        }
        // Fallback if email confirmation is still on
        setDone(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
        })
        if (error) { setError('Invalid email or password'); return }
        window.location.href = '/dashboard'
      }
    } catch (e) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login')
    setError('')
    setEmail('')
    setPassword('')
    setDone(false)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--paper)' }}>
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 900, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>REFRAME</Link>
        <Link href="/generate" style={{ textDecoration: 'none', fontSize: '13px', color: 'var(--muted)' }}>Try without account</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h2 style={{ fontWeight: 900, fontSize: '20px', marginBottom: '10px' }}>Check your email</h2>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                We sent a confirmation link to <strong>{email}</strong>
              </p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={switchMode}>Back to sign in</button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontWeight: 900, fontSize: '24px', letterSpacing: '-0.02em', marginBottom: '6px' }}>
                  {mode === 'login' ? 'Welcome back' : 'Create account'}
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {mode === 'login' ? 'Sign in to Reframe' : '3 free generations on us'}
                </p>
              </div>

              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                style={{
                  width: '100%', height: '46px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  cursor: googleLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font)', fontWeight: 600, fontSize: '14px', color: 'var(--ink)',
                  transition: 'border-color 0.15s, opacity 0.15s',
                  opacity: googleLoading ? 0.6 : 1,
                  marginBottom: '20px'
                }}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>

              <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Email</label>
                  <input className="input" type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Password</label>
                  <input className="input" type="password" required autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                {error && (
                  <div style={{ padding: '10px 14px', background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.2)', borderRadius: '6px' }}>
                    <p style={{ fontSize: '13px', color: '#E53E3E', margin: 0 }}>{error}</p>
                  </div>
                )}
                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', height: '46px' }}>
                  {loading ? <div className="dot-loader"><span /><span /><span /></div> : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--muted)' }}>
                {mode === 'login' ? 'No account? ' : 'Have an account? '}
                <button onClick={switchMode} style={{ background: 'none', border: 'none', color: 'var(--ink)', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '13px', padding: 0 }}>
                  {mode === 'login' ? 'Sign up free' : 'Sign in'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
