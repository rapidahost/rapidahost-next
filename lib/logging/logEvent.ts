// lib/logging/logEvent.ts
import type { PostgrestSingleResponse } from '@supabase/supabase-js'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'
type LogPayload = Record<string, any> | string | number | boolean | null

let supabase: any | null = null

function getSupabase() {
  if (supabase) return supabase

  const url = process.env.SUPABASE_URL
  const key =
    // ใช้ SERVICE_ROLE ถ้าเป็นฝั่ง server (API routes) จะ insert ได้
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_ANON_KEY

  if (url && key) {
    // ใช้ dynamic import เพื่อลดต้นทุน bundle และให้บิลด์ผ่านถ้ายังไม่ติดตั้ง
    const { createClient } = require('@supabase/supabase-js')
    supabase = createClient(url, key, {
      auth: { persistSession: false },
    })
  }

  return supabase
}

export type LogEventInput = {
  level?: LogLevel
  event: string
  source?: string
  clientId?: string | number
  userId?: string | number
  ip?: string
  payload?: LogPayload
  meta?: Record<string, any>
}

/**
 * บันทึกเหตุการณ์ลง Supabase (ตาราง 'logs')
 * - ถ้าไม่มี ENV จะ fallback เป็น console.log เพื่อให้ไม่พัง
 * - แนะนำ schema:
 *   create table logs (
 *     id bigserial primary key,
 *     created_at timestamptz default now(),
 *     level text,
 *     event text,
 *     source text,
 *     client_id text,
 *     user_id text,
 *     ip text,
 *     payload jsonb,
 *     meta jsonb
 *   );
 */
export async function logEvent(input: LogEventInput): Promise<void> {
  const {
    level = 'info',
    event,
    source = 'api',
    clientId,
    userId,
    ip,
    payload = null,
    meta = {},
  } = input

  const s = getSupabase()
  const row = {
    level,
    event,
    source,
    client_id: clientId ? String(clientId) : null,
    user_id: userId ? String(userId) : null,
    ip: ip || null,
    payload,
    meta,
  }

  if (!s) {
    // ไม่มีคีย์ Supabase → log ลง console แทน (ไม่ให้ throw)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[logEvent:fallback]', row)
    }
    return
  }

  try {
    const res: PostgrestSingleResponse<any> = await s.from('logs').insert(row).select().single()
    if (res.error) {
      // ไม่ throw เพื่อไม่ให้กระทบ flow การชำระเงิน
      console.warn('[logEvent] supabase insert error:', res.error)
    }
  } catch (e) {
    console.warn('[logEvent] unexpected error:', (e as Error).message)
  }
}

export const logInfo = (event: string, payload?: LogPayload, meta?: Record<string, any>) =>
  logEvent({ level: 'info', event, payload, meta })

export const logWarn = (event: string, payload?: LogPayload, meta?: Record<string, any>) =>
  logEvent({ level: 'warn', event, payload, meta })

export const logError = (event: string, payload?: LogPayload, meta?: Record<string, any>) =>
  logEvent({ level: 'error', event, payload, meta })
