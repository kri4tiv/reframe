import { NextRequest } from 'next/server'
import { recomposeImage } from '@/lib/gemini'
import { checkRateLimit, getFingerprint, jsonOk, jsonErr } from '@/lib/security'
import type { Format } from '@/types'

export const maxDuration = 120
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const fp = getFingerprint(req)
    if (!checkRateLimit(fp, 10, 60_000)) {
      return jsonErr('Too many requests. Please slow down.', 429)
    }

    const { imageBase64, mimeType, filename, formats } = await req.json() as {
      imageBase64: string
      mimeType:    string
      filename:    string
      formats:     Format[]
    }

    if (!imageBase64) return jsonErr('No image provided')
    if (!mimeType || !filename) return jsonErr('Missing image metadata')
    if (!formats?.length || formats.length > 6) return jsonErr('Invalid formats')

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(mimeType)) return jsonErr('Unsupported image type. Use JPG, PNG or WebP')

    const apiKey = process.env.GEMINI_DRAFT_API_KEY
    if (!apiKey) return jsonErr('Service unavailable', 503)

    const results = await recomposeImage(
      imageBase64,
      mimeType,
      formats,
      apiKey,
      filename
    )

    return jsonOk({ results })

  } catch (err) {
    console.error('[/api/generate]', err)
    const msg = err instanceof Error ? err.message : 'Generation failed'
    return jsonErr(msg, 500)
  }
}
