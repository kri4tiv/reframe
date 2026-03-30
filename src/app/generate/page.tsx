'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import JSZip from 'jszip'
import { FORMAT_SPECS, type Format, type GenerationResult } from '@/types'

const FREE_LIMIT = 3
const ALL_FORMATS = Object.keys(FORMAT_SPECS) as Format[]

type Stage = 'upload' | 'configure' | 'generating' | 'results'

const ASPECT_DISPLAY: Record<Format, { boxW: number; boxH: number }> = {
  '1:1':  { boxW: 40, boxH: 40 },
  '3:4':  { boxW: 33, boxH: 44 },
  '4:3':  { boxW: 44, boxH: 33 },
  '9:16': { boxW: 25, boxH: 44 },
  '16:9': { boxW: 70, boxH: 39 },
  '21:9': { boxW: 70, boxH: 30 },
}

export default function GeneratePage() {
  const [stage,          setStage]         = useState<Stage>('upload')
  const [file,           setFile]          = useState<File | null>(null)
  const [previewUrl,     setPreviewUrl]    = useState<string | null>(null)
  const [selected,       setSelected]      = useState<Set<Format>>(new Set<Format>(['1:1', '9:16', '16:9']))
  const [apiKey,         setApiKey]        = useState('')
  const [showApiKey,     setShowApiKey]    = useState(false)
  const [results,        setResults]       = useState<GenerationResult[]>([])
  const [error,          setError]         = useState('')
  const [gensRemaining,  setGensRemaining] = useState<number | null>(null)
  const [genStep,        setGenStep]       = useState(0)
  const [previewModal,   setPreviewModal]  = useState<GenerationResult | null>(null)
  const [dark,           setDark]          = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDragging   = useRef(false)

  // CHANGE 6 — dynamic GEN_STEPS based on selected formats
  const GEN_STEPS = [
    'Uploading image...',
    'Analysing composition...',
    'Detecting subjects, logos and text...',
    ...Array.from(selected).map((f) => `Recomposing ${f}...`),
    'Packaging outputs...',
  ]

  // CHANGE 5 — dark mode effects
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setDark(prefersDark)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) { setError('Please upload an image file'); return }
    if (f.size > 15 * 1024 * 1024)   { setError('Image must be under 15MB'); return }
    setError('')
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setStage('configure')
  }, [])

  const toggleFormat = (fmt: Format) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(fmt)) { if (n.size > 1) n.delete(fmt) }
      else n.add(fmt)
      return n
    })
  }

  const handleGenerate = async () => {
    if (!file) return
    setError('')
    setStage('generating')
    setGenStep(0)

    const stepInterval = setInterval(() => {
      setGenStep(s => Math.min(s + 1, GEN_STEPS.length - 1))
    }, 900)

    try {
      const form = new FormData()
      form.append('image',   file)
      form.append('formats', JSON.stringify(Array.from(selected)))
      if (apiKey.trim()) form.append('apiKey', apiKey.trim())

      const res  = await fetch('/api/generate', { method: 'POST', body: form })
      const data = await res.json()
      clearInterval(stepInterval)

      if (!data.success) {
        setError(data.error || 'Generation failed')
        setStage('configure')
        return
      }

      setResults(data.data.results)
      setGensRemaining(data.data.freeGensRemaining)
      setStage('results')
    } catch (e) {
      clearInterval(stepInterval)
      setError('Network error. Please try again.')
      setStage('configure')
    }
  }

  const downloadSingle = (r: GenerationResult) => {
    const a = document.createElement('a')
    a.href     = r.dataUrl
    a.download = r.filename
    a.click()
  }

  const downloadAll = async () => {
    const zip    = new JSZip()
    const folder = zip.folder('reframe-outputs')!
    results.forEach(r => {
      const b64 = r.dataUrl.split(',')[1]
      folder.file(r.filename, b64, { base64: true })
    })
    const blob = await zip.generateAsync({ type: 'blob' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `reframe_pack_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.zip`
    a.click()
  }

  const reset = () => {
    setStage('upload')
    setFile(null)
    setPreviewUrl(null)
    setResults([])
    setError('')
    setGenStep(0)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)', fontFamily: 'var(--font)', color: 'var(--ink)' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(247,246,242,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 900, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>REFRAME</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {gensRemaining !== null && (
            <span className="free-badge">{gensRemaining} FREE {gensRemaining === 1 ? 'GEN' : 'GENS'} LEFT</span>
          )}
          {stage !== 'upload' && (
            <button className="btn btn-ghost btn-sm" onClick={reset}>New image</button>
          )}
          {/* CHANGE 5 — dark mode toggle */}
          <button
            onClick={() => setDark(d => !d)}
            className="btn btn-ghost btn-sm"
            style={{ width: '34px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1v1M7 12v1M1 7h1M12 7h1M2.5 2.5l.7.7M10.8 10.8l.7.7M10.8 2.5l-.7.7M3.2 10.8l-.7.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 7.5A5.5 5.5 0 0 1 6.5 2a5.5 5.5 0 1 0 5.5 5.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
            )}
          </button>
          <Link href="/signup" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary btn-sm">Sign up</button>
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 40px' }}>

        {/* ── UPLOAD ── */}
        {stage === 'upload' && (
          <div style={{ animation: 'fadeUp 0.4s ease forwards' }}>
            <div style={{ marginBottom: '48px' }}>
              <p className="label" style={{ marginBottom: '12px' }}>REFRAME</p>
              <h1 className="display" style={{ fontSize: 'clamp(32px, 5vw, 56px)', marginBottom: '16px' }}>Upload your creative</h1>
              <p style={{ color: 'var(--muted)', fontSize: '15px' }}>Drop any ad, banner, or campaign image. We'll recompose it for every format.</p>
            </div>

            <div
              className={`upload-zone${isDragging.current ? ' active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); isDragging.current = true }}
              onDragLeave={() => { isDragging.current = false }}
              onDrop={e => { e.preventDefault(); isDragging.current = false; const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              style={{ padding: '80px 40px', textAlign: 'center' }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              <div style={{ width: '48px', height: '48px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke="var(--muted)" strokeWidth="1.5" fill="none"/><line x1="10" y1="7" x2="10" y2="13" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/><line x1="7" y1="10" x2="13" y2="10" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>Drop your image here</p>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>or click to browse · JPG, PNG, WebP · Max 15MB</p>
            </div>

            {error && <p className="error-text" style={{ marginTop: '16px' }}>{error}</p>}

            <div style={{ marginTop: '48px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="free-badge">3 FREE GENERATIONS</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>No account required to start</span>
            </div>
          </div>
        )}

        {/* ── CONFIGURE ── */}
        {stage === 'configure' && previewUrl && (
          <div style={{ animation: 'fadeUp 0.4s ease forwards' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }}>

              {/* Left: source preview */}
              <div>
                <p className="label" style={{ marginBottom: '12px' }}>SOURCE IMAGE</p>
                <div style={{ background: 'var(--ink)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={previewUrl} alt="Source" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
                </div>
                <p style={{ marginTop: '8px', fontSize: '11px', color: 'var(--muted)' }}>{file?.name}</p>
              </div>

              {/* Right: format selection + generate */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <p className="label">SELECT FORMATS</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setSelected(new Set(ALL_FORMATS))} style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ALL</button>
                    <button onClick={() => setSelected(new Set(['1:1' as Format]))} style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>CLEAR</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                  {ALL_FORMATS.map(fmt => {
                    const spec = FORMAT_SPECS[fmt]
                    const disp = ASPECT_DISPLAY[fmt]
                    const sel  = selected.has(fmt)
                    return (
                      <div key={fmt} className={`format-pill${sel ? ' selected' : ''}`} onClick={() => toggleFormat(fmt)} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: `${disp.boxW}px`, height: `${disp.boxH}px`, flexShrink: 0, border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, background: sel ? 'rgba(255,77,0,0.08)' : 'var(--surface-2)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {sel && <div style={{ width: '6px', height: '6px', background: 'var(--accent)', borderRadius: '50%' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: sel ? 'var(--accent)' : 'var(--ink)' }}>{fmt}</span>
                            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{spec.label}</span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{spec.platform}</span>
                        </div>
                        <div style={{ width: '18px', height: '18px', border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, background: sel ? 'var(--accent)' : 'transparent', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
                          {sel && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* API Key section */}
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showApiKey ? '12px' : '0' }}>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '2px' }}>Gemini API Key</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)' }}>Optional — we'll use our demo key for your first 3 gens</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowApiKey(s => !s)}>
                      {showApiKey ? 'Hide' : 'Add key'}
                    </button>
                  </div>
                  {showApiKey && (
                    <input
                      className="input"
                      type="password"
                      placeholder="AIza..."
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      style={{ fontSize: '13px', fontFamily: 'var(--font-mono, monospace)' }}
                    />
                  )}
                </div>

                {error && <p className="error-text" style={{ marginBottom: '12px' }}>{error}</p>}

                <button
                  className="btn btn-accent"
                  onClick={handleGenerate}
                  disabled={selected.size === 0}
                  style={{ width: '100%', height: '52px', fontSize: '14px' }}
                >
                  Generate {selected.size} format{selected.size > 1 ? 's' : ''}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>

                <p style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '10px' }}>
                  Uses your 3 free generations · <Link href="/signup" style={{ color: 'var(--ink)' }}>Sign up</Link> for unlimited with your API key
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── GENERATING — CHANGE 3 ── */}
        {stage === 'generating' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', animation: 'fadeIn 0.3s ease forwards' }}>

            {/* Source image with corner marks */}
            <div style={{ position: 'relative', width: '120px', height: '90px', marginBottom: '40px' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden', background: 'var(--dim)' }}>
                {previewUrl && <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />}
              </div>
              {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
                <div key={v+h} style={{ position: 'absolute', [v]: '-3px', [h]: '-3px', width: '10px', height: '10px',
                  borderTop: v === 'top' ? '2px solid var(--accent)' : 'none',
                  borderBottom: v === 'bottom' ? '2px solid var(--accent)' : 'none',
                  borderLeft: h === 'left' ? '2px solid var(--accent)' : 'none',
                  borderRight: h === 'right' ? '2px solid var(--accent)' : 'none',
                }} />
              ))}
            </div>

            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '10px' }}>
              REFRAMING {selected.size} FORMAT{selected.size > 1 ? 'S' : ''}
            </p>

            <p style={{ fontSize: '15px', fontWeight: 500, marginBottom: '8px', color: 'var(--ink)' }}>
              {GEN_STEPS[genStep]}
            </p>

            {/* Time estimate */}
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '32px' }}>
              Est. {Math.round(selected.size * 18)}–{Math.round(selected.size * 28)}s remaining
            </p>

            {/* Progress bar */}
            <div style={{ width: '100%', maxWidth: '360px', marginBottom: '32px' }}>
              <div style={{ height: '3px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: '999px',
                  background: 'var(--accent)',
                  width: `${Math.round((genStep / (GEN_STEPS.length - 1)) * 100)}%`,
                  transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Analysing</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{Math.round((genStep / (GEN_STEPS.length - 1)) * 100)}%</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Done</span>
              </div>
            </div>

            {/* Step list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '320px' }}>
              {GEN_STEPS.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                    border: `1.5px solid ${i < genStep ? 'var(--accent)' : i === genStep ? 'var(--accent)' : 'var(--border)'}`,
                    background: i < genStep ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s',
                  }}>
                    {i < genStep && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {i === genStep && (
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulseDot 1.4s ease-in-out infinite' }} />
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: i <= genStep ? 'var(--ink)' : 'var(--muted)', transition: 'color 0.3s', fontWeight: i === genStep ? 500 : 400 }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {stage === 'results' && results.length > 0 && (
          <div style={{ animation: 'fadeUp 0.4s ease forwards' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <p className="label" style={{ marginBottom: '6px' }}>RESULTS — {results.length} FORMAT{results.length > 1 ? 'S' : ''}</p>
                <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Click any image to preview or download</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-ghost" onClick={reset}>New image</button>
                <button className="btn btn-primary" onClick={downloadAll}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v9M4 7l3 3 3-3M1 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Download all — ZIP
                </button>
              </div>
            </div>

            {/* CHANGE 4 — Preview Modal */}
            {previewModal && (
              <div
                onClick={() => setPreviewModal(null)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
              >
                <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px' }}>{previewModal.ratio}</span>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{previewModal.px}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => downloadSingle(previewModal)}>Download PNG</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPreviewModal(null)}>✕</button>
                    </div>
                  </div>
                  <div style={{ overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', minHeight: '200px' }}>
                    <img src={previewModal.dataUrl} alt={previewModal.ratio} style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block' }} />
                  </div>
                  <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>{previewModal.filename}</p>
                  </div>
                </div>
              </div>
            )}

            {/* CHANGE 4 — Results Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {results.map(r => (
                <div key={r.slug} className="card" style={{ overflow: 'hidden', transition: 'transform 0.15s, border-color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                >
                  {/* Image */}
                  <div style={{ background: 'var(--dim)', aspectRatio: String(FORMAT_SPECS[r.ratio].w / FORMAT_SPECS[r.ratio].h), overflow: 'hidden', position: 'relative' }}>
                    <img src={r.dataUrl} alt={r.ratio} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    {/* Hover overlay */}
                    <div className="result-hover-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.5)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)'}
                    >
                      <button className="btn btn-primary btn-sm" style={{ opacity: 0, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => { const p = (e.currentTarget as HTMLElement).parentElement; if(p) Array.from(p.querySelectorAll('button')).forEach((b: Element) => (b as HTMLElement).style.opacity = '1') }}
                        onClick={e => { e.stopPropagation(); setPreviewModal(r) }}>Preview</button>
                      <button className="btn btn-ghost btn-sm" style={{ opacity: 0, transition: 'opacity 0.2s', background: 'rgba(255,255,255,0.9)' }}
                        onMouseEnter={e => { const p = (e.currentTarget as HTMLElement).parentElement; if(p) Array.from(p.querySelectorAll('button')).forEach((b: Element) => (b as HTMLElement).style.opacity = '1') }}
                        onClick={e => { e.stopPropagation(); downloadSingle(r) }}>Download</button>
                    </div>
                  </div>
                  {/* Info */}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>{r.ratio}</span>
                      <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{r.px}</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', wordBreak: 'break-all' }}>{r.filename}</p>
                  </div>
                  {/* Actions */}
                  <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: '11px' }} onClick={() => setPreviewModal(r)}>Preview</button>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: '11px' }} onClick={() => downloadSingle(r)}>Download</button>
                  </div>
                </div>
              ))}
            </div>

            {gensRemaining !== null && gensRemaining === 0 && (
              <div style={{ marginTop: '32px', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>You've used your 3 free generations</p>
                  <p style={{ fontSize: '13px', color: 'rgba(247,246,242,0.5)' }}>Create a free account and add your Gemini API key to keep going. ~$0.07 per run.</p>
                </div>
                <Link href="/signup" style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <button className="btn btn-accent">Create account</button>
                </Link>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
