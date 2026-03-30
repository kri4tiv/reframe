import { NextRequest } from 'next/server'
import { recomposeImage } from '@/lib/gemini'
import { getFingerprint, checkRateLimit, isValidApiKey, jsonOk, jsonErr, decryptApiKey } from '@/lib/security'
import { getFreeGensUsed, incrementFreeGen, hasFreeGensLeft, saveGeneration } from '@/lib/generations'
import { createServerSupabase } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import type { Format } from '@/types'

export const maxDuration = 120
export const runtime     = 'nodejs'

const FREE_LIMIT = parseInt(process.env.NEXT_PUBLIC_FREE_GENERATIONS || '3')

export async function POST(req: NextRequest) {
  try {
    // ── Rate limiting ────────────────────────────────────────────
    const fp = getFingerprint(req)
    if (!checkRateLimit(fp, 10, 60_000)) {
      return jsonErr('Too many requests. Please slow down.', 429)
    }

    // ── Parse form data ──────────────────────────────────────────
    const form      = await req.formData()
    const imageFile = form.get('image') as File | null
    const formatsRaw = form.get('formats') as string | null
    const apiKeyRaw  = form.get('apiKey') as string | null  // null for free gens

    if (!imageFile) return jsonErr('No image provided')
    if (!formatsRaw) return jsonErr('No formats selected')

    const formats = JSON.parse(formatsRaw) as Format[]
    if (!formats.length || formats.length > 6) return jsonErr('Invalid formats')

    // ── Validate image ───────────────────────────────────────────
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(imageFile.type)) return jsonErr('Unsupported image type')
    if (imageFile.size > 15 * 1024 * 1024)  return jsonErr('Image must be under 15MB')

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    const imageBase64 = imageBuffer.toString('base64')
    const sourceHash  = crypto.createHash('sha256').update(imageBuffer).digest('hex').slice(0, 16)

    // ── Determine API key + auth ─────────────────────────────────
    let resolvedApiKey: string
    let userId: string | undefined

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id

    if (apiKeyRaw) {
      // User provided their own key — validate it
      if (!isValidApiKey(apiKeyRaw)) return jsonErr('Invalid API key format')
      resolvedApiKey = apiKeyRaw

      // Must be logged in to use own key
      if (!userId) return jsonErr('Please sign in to use your API key', 401)

    } else {
      // Free generation — check limit
      const freeUsed = await getFreeGensUsed(fp)

      // If logged in, check their account free gens too
      if (userId) {
        const db = createServiceClient()
        const { data: profile } = await db
          .from('profiles')
          .select('free_gens_used')
          .eq('id', userId)
          .single()
        const accountUsed = profile?.free_gens_used || 0
        if (accountUsed >= FREE_LIMIT) return jsonErr('Free generations used. Add your Gemini API key to continue.', 402)
      } else {
        if (freeUsed >= FREE_LIMIT) return jsonErr('Free generations used. Sign up to continue.', 402)
      }

      const draftKey = process.env.GEMINI_DRAFT_API_KEY
      if (!draftKey) return jsonErr('Service temporarily unavailable', 503)
      resolvedApiKey = draftKey
    }

    // ── Run recomposition ────────────────────────────────────────
    const results = await recomposeImage(
      imageBase64,
      imageFile.type,
      formats,
      resolvedApiKey,
      imageFile.name
    )

    // ── Increment counters ───────────────────────────────────────
    if (!apiKeyRaw) {
      await incrementFreeGen(fp)
      if (userId) {
        const db = createServiceClient()
        await db.rpc('increment_free_gens', { user_id: userId })
      }
    }

    // ── Save generation record ───────────────────────────────────
    await saveGeneration({
      userId,
      sessionId:  fp,
      formats,
      sourceHash,
      status:     'done',
    })

    // ── Return ───────────────────────────────────────────────────
    const freeUsedAfter = await getFreeGensUsed(fp)
    return jsonOk({
      results,
      freeGensUsed:      freeUsedAfter,
      freeGensRemaining: Math.max(0, FREE_LIMIT - freeUsedAfter),
    })

  } catch (err) {
    console.error('[/api/generate]', err)
    const msg = err instanceof Error ? err.message : 'Generation failed'
    return jsonErr(msg, 500)
  }
}
