import { NextApiRequest, NextApiResponse } from 'next'
import { insertFailedLog } from '@/lib/insertLog'
import { randomUUID } from 'crypto'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const trace_id = randomUUID()

  const result = await insertFailedLog({
    trace_id,
    event: 'test.log.failed',
    message: 'This is a failed log for retry test',
    source: 'system',
    payload: { error: 'Simulated failure for retry testing' }
  })

  if (!result) {
    console.error('🔴 insertFailedLog returned null or error!')
    return res.status(500).json({ success: false, message: 'Failed to insert log' })
  }

  // ✅ Redirect ไปยังหน้ารายละเอียด log
  res.redirect(302, `/admin/logs/${trace_id}`)
}

