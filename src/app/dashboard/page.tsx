'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  email:            string
  freeGensUsed:     number
  freeGensTotal:    number
  totalGenerations: number
  apiKeySet:        boolean
  createdAt:        string
}

interface Generation {
  id:         string
  formats:    string[]
  status:     string
  created_at: string
}

export default function DashboardPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile,    setProfile]    = useState<Profile | null>(null)
  const [history,    setHistory]    = useState<Generation[]>([])
  const [apiKey,     setApiKey]     = useState('')
  const [showKey,    setShowKey]    = useState(false)
  const [keySaving,  setKeySaving]  = useState(false)
  const [keySaved,   setKeySaved]   = useState(false)
  const [keyError,   setKeyError]   = useState('')
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState<'overview' | 'history' | 'settings'>('overview')

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/login'
    }
    checkSession()
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [profileRes, histRes] = await Promise.all([
        fetch('/api/user'),
        supabase.from('generations').select('id, formats, status, created_at').order('created_at', { ascending: false }).limit(50),
      ])
      const profileData = await profileRes.json()
      if (profileData.success) setProfile(profileData.data)
      if (!histRes.error) setHistory(histRes.data || [])
    } finally {
      setLoading(false)
    }
  }

  async function saveApiKey() {
    setKeyError('')
    setKeySaving(true)
    try {
      const res  = await fetch('/api/user', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ apiKey }),
      })
      const data = await res.json()
      if (!data.success) { setKeyError(data.error || 'Failed to save'); return }
      setKeySaved(true)
      setApiKey('')
      setShowKey(false)
      await loadData()
      setTimeout(() => setKeySaved(false), 3000)
    } finally {
      setKeySaving(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--paper)', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="dot-loader"><span /><span /><span /></div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)', fontFamily: 'var(--font)', color: 'var(--ink)' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--paper)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 900, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>REFRAME</Link>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/generate" style={{ textDecoration: 'none' }}>
            <button className="btn btn-accent btn-sm">New generation</button>
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 40px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '40px' }}>
          <p className="label" style={{ marginBottom: '6px' }}>DASHBOARD</p>
          <h1 style={{ fontWeight: 900, fontSize: '28px', letterSpacing: '-0.02em' }}>{profile?.email?.split('@')[0]}</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>{profile?.email}</p>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '40px' }}>
          {[
            { label: 'Total generations', value: profile?.totalGenerations || 0 },
            { label: 'Free gens used',    value: `${profile?.freeGensUsed || 0} / ${profile?.freeGensTotal || 3}` },
            { label: 'API key',           value: profile?.apiKeySet ? 'Connected' : 'Not set' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>{s.label}</p>
              <p style={{ fontWeight: 900, fontSize: '22px', letterSpacing: '-0.02em' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
          {(['overview', 'history', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                fontSize: '13px', fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? 'var(--ink)' : 'var(--muted)',
                padding: '10px 20px', borderBottom: `2px solid ${activeTab === tab ? 'var(--ink)' : 'transparent'}`,
                marginBottom: '-1px', transition: 'all 0.15s', textTransform: 'capitalize',
                letterSpacing: '0.02em',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Overview tab ── */}
        {activeTab === 'overview' && (
          <div style={{ animation: 'fadeUp 0.3s ease forwards' }}>

            {/* API key CTA if not set */}
            {!profile?.apiKeySet && (
              <div style={{ background: 'var(--ink)', color: 'var(--paper)', borderRadius: 'var(--radius-lg)', padding: '28px 32px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>Add your Gemini API key</p>
                  <p style={{ fontSize: '13px', color: 'rgba(247,246,242,0.5)', lineHeight: 1.6 }}>
                    Get unlimited generations at ~$0.07/run. Get a free key at{' '}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>aistudio.google.com</a>
                  </p>
                </div>
                <button className="btn btn-accent" onClick={() => setActiveTab('settings')}>Add key</button>
              </div>
            )}

            {/* Quick start */}
            <div className="card" style={{ padding: '28px 32px' }}>
              <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '20px' }}>Ready to reframe?</p>
              <Link href="/generate" style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary btn-lg">
                  Start new generation
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </Link>
            </div>

            {/* Recent history */}
            {history.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>Recent generations</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {history.slice(0, 5).map(g => (
                    <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {g.formats.map(f => (
                            <span key={f} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '4px', letterSpacing: '0.04em' }}>{f}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{formatDate(g.created_at)}</p>
                        <p style={{ fontSize: '11px', color: 'var(--muted)' }}>{formatTime(g.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {history.length > 5 && (
                  <button onClick={() => setActiveTab('history')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer', marginTop: '10px', fontFamily: 'var(--font)' }}>
                    View all {history.length} generations →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── History tab ── */}
        {activeTab === 'history' && (
          <div style={{ animation: 'fadeUp 0.3s ease forwards' }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <p style={{ fontSize: '15px', marginBottom: '8px' }}>No generations yet</p>
                <p style={{ fontSize: '13px', marginBottom: '24px' }}>Upload your first creative to get started</p>
                <Link href="/generate"><button className="btn btn-primary">Start generating</button></Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '16px', padding: '8px 18px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Formats</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Date</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Status</span>
                </div>
                {history.map(g => (
                  <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {g.formats.map(f => (
                        <span key={f} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '4px', letterSpacing: '0.04em' }}>{f}</span>
                      ))}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(g.created_at)} · {formatTime(g.created_at)}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', background: g.status === 'done' ? '#F0FFF4' : 'var(--surface-2)', color: g.status === 'done' ? '#38A169' : 'var(--muted)', border: `1px solid ${g.status === 'done' ? '#9AE6B4' : 'var(--border)'}`, borderRadius: '100px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {g.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Settings tab ── */}
        {activeTab === 'settings' && (
          <div style={{ animation: 'fadeUp 0.3s ease forwards', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* API Key */}
            <div className="card" style={{ padding: '24px 28px' }}>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Gemini API Key</p>
                <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
                  {profile?.apiKeySet
                    ? 'Your API key is saved and encrypted. Replace it below.'
                    : 'Add your key from Google AI Studio to run unlimited generations.'}
                  {' '}<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" style={{ color: 'var(--ink)', fontWeight: 700 }}>Get a key →</a>
                </p>
              </div>

              {profile?.apiKeySet && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ width: '8px', height: '8px', background: '#38A169', borderRadius: '50%', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>API key saved · AES-256 encrypted</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    className="input"
                    type={showKey ? 'text' : 'password'}
                    placeholder="AIza..."
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    style={{ paddingRight: '40px', fontFamily: 'monospace', fontSize: '13px' }}
                  />
                  <button
                    onClick={() => setShowKey(s => !s)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      {showKey
                        ? <><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/></>
                        : <><path d="M2 2l12 12M6.5 6.7A3 3 0 0 0 9.3 9.5M4.2 4.3C2.8 5.3 1.7 6.7 1 8c1.3 2.6 4 5 7 5a7 7 0 0 0 3.8-1.2M6 3.2A7 7 0 0 1 8 3c3 0 5.7 2.4 7 5a9.4 9.4 0 0 1-1.6 2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></>
                      }
                    </svg>
                  </button>
                </div>
                <button className="btn btn-primary" onClick={saveApiKey} disabled={!apiKey.trim() || keySaving} style={{ flexShrink: 0 }}>
                  {keySaving ? <div className="dot-loader"><span /><span /><span /></div> : keySaved ? '✓ Saved' : 'Save'}
                </button>
              </div>
              {keyError && <p className="error-text" style={{ marginTop: '8px' }}>{keyError}</p>}
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '10px' }}>
                Your key is encrypted with AES-256-GCM before storage. We never log or expose it.
              </p>
            </div>

            {/* Account */}
            <div className="card" style={{ padding: '24px 28px' }}>
              <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>Account</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Email</span>
                  <span style={{ fontWeight: 500 }}>{profile?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Member since</span>
                  <span style={{ fontWeight: 500 }}>{profile?.createdAt ? formatDate(profile.createdAt) : '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 0' }}>
                  <span style={{ color: 'var(--muted)' }}>Total generations</span>
                  <span style={{ fontWeight: 500 }}>{profile?.totalGenerations || 0}</span>
                </div>
              </div>
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button onClick={signOut} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Sign out of this account
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
