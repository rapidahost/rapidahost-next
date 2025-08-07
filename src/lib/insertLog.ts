// lib/insertLog.ts
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type InsertLogParams = {
  event: string
  status: string
  source: string
  message: string
  traceId?: string
  payload?: Record<string, any>
}

export async function insertLog({
  event,
  status,
  source,
  message,
  traceId = uuidv4(),
  payload = {},
}: InsertLogParams): Promise<{ success: boolean; traceId: string }> {
  const { error } = await supabase.from('logs').insert([
    {
      event,
      status,
      source,
      message,
      trace_id: traceId,
      payload,
    },
  ])

  if (error) {
    console.error('❌ Failed to insert log:', error)
    return { success: false, traceId }
  }

  console.log('✅ Log inserted:', { event, status, traceId })
  return { success: true, traceId }
}
