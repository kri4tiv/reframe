import { createServiceClient } from './supabase/server'

const FREE_LIMIT = parseInt(process.env.NEXT_PUBLIC_FREE_GENERATIONS || '3')

export async function getFreeGensUsed(fingerprint: string): Promise<number> {
  const db = createServiceClient()
  const { data } = await db
    .from('free_generations')
    .select('count')
    .eq('fingerprint', fingerprint)
    .single()
  return data?.count || 0
}

export async function incrementFreeGen(fingerprint: string): Promise<void> {
  const db    = createServiceClient()
  const used  = await getFreeGensUsed(fingerprint)
  if (used === 0) {
    await db.from('free_generations').insert({ fingerprint, count: 1 })
  } else {
    await db.from('free_generations').update({ count: used + 1 }).eq('fingerprint', fingerprint)
  }
}

export async function hasFreeGensLeft(fingerprint: string): Promise<boolean> {
  const used = await getFreeGensUsed(fingerprint)
  return used < FREE_LIMIT
}

export async function getUserGenCount(userId: string): Promise<number> {
  const db = createServiceClient()
  const { count } = await db
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count || 0
}

export async function saveGeneration(params: {
  userId?:    string
  sessionId:  string
  formats:    string[]
  sourceHash: string
  status:     string
}) {
  const db = createServiceClient()
  const { data } = await db
    .from('generations')
    .insert({
      user_id:     params.userId || null,
      session_id:  params.sessionId,
      formats:     params.formats,
      source_hash: params.sourceHash,
      status:      params.status,
    })
    .select()
    .single()
  return data
}
