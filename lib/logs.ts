export type LogRow = {
  id?: string
  event: string
  source: string
  level: 'info' | 'warn' | 'error'
  payload?: any
  meta?: Record<string, any> | null
  traceId?: string | null
  createdAt?: string
}

export async function insertLog(row: LogRow): Promise<{ id: string }> {
  // เขียนจริงตามที่คุณเชื่อม Supabase/DB
  // ตัวอย่าง Supabase:
  // const { data, error } = await supabase.from('logs').insert({
  //   event: row.event, source: row.source, level: row.level,
  //   payload: row.payload ?? null, meta: row.meta ?? null,
  //   trace_id: row.traceId ?? null
  // }).select('id').single()
  // if (error) throw error
  // return { id: data.id }

  // mock สำหรับทดสอบโลคอล
  return { id: 'mock-' + Date.now() }
}
