'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const FORMATS = [
  { label: '1:1',  name: 'Square',    w: 1, h: 1 },
  { label: '9:16', name: 'Story',     w: 9, h: 16 },
  { label: '16:9', name: 'Landscape', w: 16, h: 9 },
  { label: '3:4',  name: 'Portrait',  w: 3, h: 4 },
  { label: '3:1',  name: 'Banner',    w: 3, h: 1 },
]

const STEPS = [
  { n: '01', title: 'Upload your creative', body: 'Drop any ad, banner, or campaign image. JPG, PNG, WebP up to 15MB.' },
  { n: '02', title: 'Pick your formats',    body: 'Select one or multiple output formats. We handle up to 6 at once.' },
  { n: '03', title: 'Reframe generates',   body: 'AI analyses your composition — headings, logos, subjects — and recomposes each format with design logic.' },
  { n: '04', title: 'Download your pack',  body: 'Preview all outputs. Download individually or as a ZIP with correct naming conventions.' },
]

export default function LandingPage() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--font)' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(247,246,242,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 900, fontSize: '15px', letterSpacing: '-0.02em' }}>REFRAME</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button className="btn btn-ghost btn-sm">Sign in</button>
          </Link>
          <Link href="/generate" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary btn-sm">Try free</button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '100px 40px 80px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
          <span className="free-badge">3 FREE GENERATIONS</span>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>No signup required</span>
        </div>

        <h1 className="display" style={{ fontSize: 'clamp(44px, 7vw, 84px)', marginBottom: '24px', maxWidth: '800px' }}>
          One image.<br />
          <span style={{ color: 'var(--accent)' }}>Every format.</span>
        </h1>

        <p style={{ fontSize: '18px', color: 'var(--muted)', maxWidth: '520px', lineHeight: 1.7, marginBottom: '40px' }}>
          AI-powered recomposition for marketing teams. Upload a creative, select your formats — Reframe handles the rest with real design logic.
        </p>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/generate" style={{ textDecoration: 'none' }}>
            <button className="btn btn-accent btn-lg">
              Start reframing
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </Link>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>3 free · No card required</span>
        </div>

        {/* Format strip */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '60px', flexWrap: 'wrap' }}>
          {FORMATS.map((f, i) => {
            const scale  = 48
            const aspect = f.w / f.h
            const fw     = aspect >= 1 ? Math.round(Math.min(scale * aspect, 80)) : Math.round(scale * aspect)
            const fh     = aspect >= 1 ? scale : scale
            const active = tick % FORMATS.length === i
            return (
              <div key={f.label} style={{ textAlign: 'center', transition: 'transform 0.2s', transform: active ? 'translateY(-4px)' : 'none' }}>
                <div style={{ width: `${fw}px`, height: `${fh}px`, background: active ? 'var(--ink)' : 'var(--surface-2)', border: `1px solid ${active ? 'var(--ink)' : 'var(--border)'}`, borderRadius: '4px', margin: '0 auto 8px', transition: 'all 0.2s' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: active ? 'var(--ink)' : 'var(--muted)' }}>{f.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '80px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p className="label" style={{ color: 'rgba(247,246,242,0.4)', marginBottom: '48px' }}>HOW IT WORKS</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px' }}>
            {STEPS.map(s => (
              <div key={s.n}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', display: 'block', marginBottom: '16px' }}>{s.n}</span>
                <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '10px', letterSpacing: '-0.01em' }}>{s.title}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(247,246,242,0.5)', lineHeight: 1.7 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 40px' }}>
        <p className="label" style={{ marginBottom: '48px' }}>PRICING</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Free */}
          <div className="card" style={{ padding: '32px' }}>
            <p style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.01em', marginBottom: '8px' }}>Free</p>
            <p style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '4px' }}>3 <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--muted)' }}>generations</span></p>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '28px' }}>No signup. No card.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {['All 6 formats', 'High quality output', 'Download PNG', 'No watermark'].map(f => (
                <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px' }}>
                  <div style={{ width: '5px', height: '5px', background: 'var(--accent)', borderRadius: '50%', flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>
            <Link href="/generate"><button className="btn btn-ghost" style={{ width: '100%' }}>Try now</button></Link>
          </div>

          {/* Pro */}
          <div className="card" style={{ padding: '32px', border: '1.5px solid var(--ink)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--ink)', color: 'var(--paper)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', padding: '3px 10px', borderRadius: '100px' }}>BYOK</div>
            <p style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.01em', marginBottom: '8px' }}>Pro</p>
            <p style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '4px' }}>~$0.07 <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--muted)' }}>per run</span></p>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '28px' }}>Bring your own Gemini API key</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {['Unlimited generations', 'All 6 formats per run', 'Generation history', 'ZIP download pack', 'Correct file naming'].map(f => (
                <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px' }}>
                  <div style={{ width: '5px', height: '5px', background: 'var(--accent)', borderRadius: '50%', flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>
            <Link href="/signup"><button className="btn btn-primary" style={{ width: '100%' }}>Create account</button></Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 900, fontSize: '13px', letterSpacing: '-0.01em' }}>REFRAME</span>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>AI-powered image recomposition</span>
      </footer>

    </div>
  )
}
