// lib/logs.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function getLogByTraceId(traceId: string) {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .eq('trace_id', traceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
