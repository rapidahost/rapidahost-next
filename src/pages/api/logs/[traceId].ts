// pages/api/logs/[traceId].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getLogByTraceId } from '@/lib/logs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { traceId } = req.query

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!traceId || typeof traceId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid traceId' })
  }

  try {
    const logs = await getLogByTraceId(traceId)
    if (!logs.length) {
      return res.status(404).json({ error: 'Log not found' })
    }

    res.status(200).json({ logs })
  } catch (error) {
    console.error('Error fetching logs:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
