// ✅ /pages/api/admin/logs.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const LOGTAIL_API_KEY = process.env.LOGTAIL_API_KEY || ''
const SOURCE_TOKEN = process.env.LOGTAIL_SOURCE_TOKEN || ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { traceId, limit = 100 } = req.query

  const headers = {
    Authorization: `Bearer ${LOGTAIL_API_KEY}`,
    'Content-Type': 'application/json',
  }

  const params = new URLSearchParams({ limit: limit.toString() })
  if (traceId) params.append('query', `traceId:${traceId}`)

  const response = await fetch(`https://in.logtail.com/api/v1/sources/${SOURCE_TOKEN}/logs?${params}`, { headers })
  const logs = await response.json()

  res.status(200).json(logs)
}
