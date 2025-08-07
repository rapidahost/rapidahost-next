// pages/api/test-insert-log.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { insertLog } from '@/lib/insertLog'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const traceId = uuidv4()
  await insertLog({
    event: 'test.log.insert',
    status: 'Success',
    traceId,
    source: 'system',
    message: 'Test insert log from API',
    payload: { hello: 'world' },
  })

  res.status(200).json({ message: 'Inserted log', traceId })
}
