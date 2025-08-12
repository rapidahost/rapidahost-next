// lib/log.ts — helper เขียน log ลง Supabase (หรือ fallback console)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null

type LogRow = {
  traceId: string
  source: string
  step: string
  status: 'success' | 'failed' | 'info'
  message?: string
  data?: any
}

export async function insertLog(row: LogRow) {
  if (!supabase) { console.log('[LOG]', row); return }
  try {
    await supabase.from('logs').insert({
      trace_id: row.traceId,
      source: row.source,
      step: row.step,
      status: row.status,
      message: row.message || null,
      data: row.data || null,
    })
  } catch (e) {
    console.error('[LOG][supabase] insert failed', e)
  }
}
