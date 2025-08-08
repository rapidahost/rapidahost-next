// lib/logging/logEvent.ts
export type LogLevel = 'info' | 'warn' | 'error' | 'debug'
export type LogPayload = Record<string, any> | string | number | boolean | null

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

// มี export ฟังก์ชันจริง => ไฟล์นี้กลายเป็น “module”
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

  const url = process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY

  // ไม่มี ENV → fallback เป็น console (เพื่อไม่ให้ flow หลุด)
  if (!url || !key) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[logEvent:fallback]', {
        level, event, source, clientId, userId, ip, payload, meta,
      })
    }
    return
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(url, key, { auth: { persistSession: false } })

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

    const { error } = await supabase.from('logs').insert(row)
    if (error) {
      // ไม่ throw เพื่อไม่พัง flow หลัก
      console.warn('[logEvent] supabase insert error:', error)
    }
  } catch (e: any) {
    console.warn('[logEvent] unexpected error:', e?.message || e)
  }
}

// เผื่อมีที่ไหน import default
export default logEvent
