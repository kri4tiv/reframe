import { NextRequest } from 'next/server'
import { createServerSupabase, createServiceClient } from '@/lib/supabase/server'
import { encryptApiKey, isValidApiKey, checkRateLimit, getFingerprint, jsonOk, jsonErr } from '@/lib/security'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return jsonErr('Unauthorised', 401)

    const db = createServiceClient()
    const { data: profile } = await db
      .from('profiles')
      .select('free_gens_used, total_generations, has_api_key, created_at')
      .eq('id', user.id)
      .single()

    const { count: historyCount } = await db
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return jsonOk({
      id:               user.id,
      email:            user.email,
      freeGensUsed:     profile?.free_gens_used || 0,
      freeGensTotal:    3,
      totalGenerations: historyCount || 0,
      apiKeySet:        profile?.has_api_key || false,
      createdAt:        user.created_at,
    })
  } catch (err) {
    return jsonErr('Failed to load profile', 500)
  }
}

export async function POST(req: NextRequest) {
  const fp = getFingerprint(req)
  if (!checkRateLimit(`apikey:${fp}`, 5, 60_000)) {
    return jsonErr('Too many requests', 429)
  }

  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return jsonErr('Unauthorised', 401)

    const { apiKey } = await req.json()
    if (!apiKey) return jsonErr('No API key provided')
    if (!isValidApiKey(apiKey)) return jsonErr('Invalid API key format')

    const encrypted = encryptApiKey(apiKey)
    const db        = createServiceClient()

    await db.from('profiles').upsert({
      id:          user.id,
      has_api_key: true,
      api_key_enc: encrypted,
      updated_at:  new Date().toISOString(),
    })

    return jsonOk({ saved: true })
  } catch (err) {
    return jsonErr('Failed to save API key', 500)
  }
}
