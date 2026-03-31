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

    const form = await req.formData()
    const imageFile = form.get('image') as File | null
    const formatsRaw = form.get('formats') as string | null

    if (!imageFile) return jsonErr('No image provided')
    if (!formatsRaw) return jsonErr('No formats selected')

    const formats = JSON.parse(formatsRaw) as Format[]
    if (!formats.length || formats.length > 6) return jsonErr('Invalid formats')

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(imageFile.type)) return jsonErr('Unsupported image type. Use JPG, PNG or WebP')
    if (imageFile.size > 15 * 1024 * 1024) return jsonErr('Image must be under 15MB')

    const apiKey = process.env.GEMINI_DRAFT_API_KEY
    if (!apiKey) return jsonErr('Service unavailable', 503)

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    const imageBase64 = imageBuffer.toString('base64')

    const results = await recomposeImage(
      imageBase64,
      imageFile.type,
      formats,
      apiKey,
      imageFile.name
    )

    return jsonOk({ results })

  } catch (err) {
    console.error('[/api/generate]', err)
    const msg = err instanceof Error ? err.message : 'Generation failed'
    return jsonErr(msg, 500)
  }
}
