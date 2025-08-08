// lib/logs.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type InsertLogInput = {
  event: string
  source: string
  level?: LogLevel
  payload?: any
  meta?: any
  traceId?: string | null
}

export type LogRow = {
  id: string
  created_at: string
  event: string
  source: string
  level: LogLevel
  payload: any
  meta: any
  trace_id: string | null
}

// ---- Supabase client (optional) ----
let sb: SupabaseClient | null = null
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
  sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  })
}

// ตารางที่ใช้เก็บ log (สร้างเองถ้ายังไม่มี)
// create table logs (
//   id uuid primary key default gen_random_uuid(),
//   created_at timestamptz default now(),
//   event text not null,
//   source text not null,
//   level text not null,
//   payload jsonb,
//   meta jsonb,
//   trace_id text
// );

export async function insertLog(input: InsertLogInput) {
  const row = {
    event: input.event,
    source: input.source,
    level: (input.level ?? 'info') as LogLevel,
    payload: input.payload ?? null,
    meta: input.meta ?? null,
    trace_id: input.traceId ?? null,
  }

  if (!sb) {
    // fallback เพื่อให้โค้ดรัน/บิลด์ได้แม้ไม่มี Supabase
    if (process.env.NODE_ENV !== 'test') {
      console.log('[logs.insert fallback]', row)
    }
    return { id: null, inserted: false, fallback: true }
  }

  const { data, error } = await sb.from('logs').insert(row).select('id').single()
  if (error) {
    // ไม่โยน error ออกไปเพื่อกัน production พัง; แค่ log ไว้
    console.error('[logs.insert error]', error)
    return { id: null, inserted: false, error: error.message }
  }
  return { id: data?.id ?? null, inserted: true }
}

export async function getLogByTraceId(traceId: string): Promise<LogRow[]> {
  if (!traceId) return []
  if (!sb) {
    console.warn('[logs.select fallback] missing Supabase env')
    return []
  }
  const { data, error } = await sb
    .from('logs')
    .select('*')
    .eq('trace_id', traceId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[logs.select error]', error)
    return []
  }
  return (data as LogRow[]) ?? []
}
