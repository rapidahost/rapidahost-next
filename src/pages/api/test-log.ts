// pages/api/test-log.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { insertLog } from '@/utils/supabaseLogs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const testLog = {
    traceId: 'demo-1234',
    type: 'stripe',
    status: 'success',
    source: 'webhook',
    request: { amount: 100 },
    response: { message: 'Paid' },
    metadata: { note: 'Test insert from API' },
  }

  const result = await insertLog(testLog)

  if (result.success) {
    return res.status(200).json({ message: 'Log inserted successfully' })
  } else {
    return res.status(500).json({ error: result.error })
  }
}

