// utils/supabaseLogs.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type LogType = {
  traceId: string
  type: 'stripe' | 'paypal' | 'whmcs' | 'email' | 'system'
  status: 'success' | 'failed'
  source: string
  request?: any
  response?: any
  metadata?: any
}

export async function insertLog(log: LogType) {
  const { data, error } = await supabase
    .from('logs')
    .insert([{
      trace_id: log.traceId,
      type: log.type,
      status: log.status,
      source: log.source,
      request: log.request ?? null,
      response: log.response ?? null,
      metadata: log.metadata ?? null,
    }])

  if (error) {
    console.error('Error inserting log:', error)
    return { success: false, error }
  }

  return { success: true, data }
}
