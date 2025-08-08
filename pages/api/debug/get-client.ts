import type { NextApiRequest, NextApiResponse } from 'next'
import { getClient } from '@/lib/whmcs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const clientId = req.query.clientId
    if (!clientId) {
      return res.status(400).json({ error: 'Missing clientId' })
    }

    const data = await getClient(Number(clientId))
    return res.status(200).json(data) // ส่ง JSON ดิบออกไป
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unknown error' })
  }
}
