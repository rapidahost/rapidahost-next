import { insertLog } from '@/lib/insertLog'
import { NextResponse } from 'next/server'

export async function GET() {
  const { traceId } = await insertLog({
    event: 'test.log.insert',
    status: 'Success',
    source: 'system',
    message: 'Test insert log from API',
    payload: { sample: 'test-data' },
  })

  return NextResponse.json({ message: 'Inserted log', traceId })
}
