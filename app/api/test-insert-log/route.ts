import { NextResponse } from 'next/server'
import { insertLog } from '@/lib/logs'   // <-- เปลี่ยนมาที่ไฟล์รวม

export async function GET() {
  await insertLog({
    event: 'test.insert',
    source: 'tester',
    level: 'info',
    payload: { hello: 'world' },
    meta: { via: 'api/test-insert-log' },
    traceId: 'debug-' + Date.now(),
  })

  return NextResponse.json({ ok: true })
}
