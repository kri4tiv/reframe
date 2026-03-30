'use client'
import { useState, useCallback, useRef } from 'react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDragging   = useRef(false)

  const GEN_STEPS = ['Uploading image...', 'Analysing composition...', 'Detecting headings & subjects...', `Recomposing ${selected.size} format${selected.size > 1 ? 's' : ''}...`, 'Finalising outputs...']

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

        {/* ── GENERATING ── */}
        {stage === 'generating' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', animation: 'fadeIn 0.3s ease forwards' }}>
            <div style={{ position: 'relative', width: '120px', height: '90px', marginBottom: '40px' }}>
              <div style={{ width: '100%', height: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', position: 'relative', background: 'var(--ink)' }}>
                {previewUrl && <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />}
                <div style={{ position: 'absolute', left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
              </div>
              {/* Corner marks */}
              {[['0','0','top','left'],['0','auto','top','right'],['auto','0','bottom','left'],['auto','auto','bottom','right']].map(([t,b,tv,lv],i) => (
                <div key={i} style={{ position: 'absolute', [tv]: '-2px', [lv === 'left' ? 'left' : 'right']: '-2px', width: '8px', height: '8px', borderTop: tv === 'top' ? '2px solid var(--accent)' : 'none', borderBottom: tv === 'bottom' ? '2px solid var(--accent)' : 'none', borderLeft: lv === 'left' ? '2px solid var(--accent)' : 'none', borderRight: lv === 'right' ? '2px solid var(--accent)' : 'none' }} />
              ))}
            </div>

            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px' }}>REFRAMING</p>
            <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '36px', minHeight: '24px' }}>{GEN_STEPS[genStep]}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '320px' }}>
              {GEN_STEPS.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '6px', height: '6px', flexShrink: 0, background: i <= genStep ? 'var(--accent)' : 'var(--border)', borderRadius: '50%', transition: 'background 0.3s' }} />
                  <span style={{ fontSize: '12px', color: i <= genStep ? 'var(--ink)' : 'var(--muted)', transition: 'color 0.3s' }}>{step}</span>
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
                <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Click any image to download individually</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-ghost" onClick={reset}>New image</button>
                <button className="btn btn-primary" onClick={downloadAll}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v9M4 7l3 3 3-3M1 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Download all — ZIP
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {results.map(r => (
                <div
                  key={r.slug}
                  onClick={() => downloadSingle(r)}
                  className="card"
                  style={{ cursor: 'pointer', overflow: 'hidden', transition: 'transform 0.15s, border-color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                >
                  <div style={{ background: 'var(--ink)', aspectRatio: String(FORMAT_SPECS[r.ratio].w / FORMAT_SPECS[r.ratio].h), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img src={r.dataUrl} alt={r.ratio} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>{r.ratio}</span>
                      <span style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.06em' }}>{r.px}</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', wordBreak: 'break-all' }}>{r.filename}</p>
                  </div>
                  <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v7M3 5l2.5 3 2.5-3M1 10h9" stroke="var(--muted)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Download PNG</span>
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
