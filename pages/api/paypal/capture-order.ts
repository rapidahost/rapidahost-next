// pages/api/paypal/capture-order.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getPayPalAccessToken, getApiBase } from '@/lib/paypal/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { orderId } = req.body as { orderId: string }
    if (!orderId) return res.status(400).json({ error: 'orderId required' })

    const token = await getPayPalAccessToken()
    const resp = await fetch(`${getApiBase()}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    const json = await resp.json()
    if (!resp.ok) {
      return res.status(resp.status).json({ error: json?.message || 'capture failed', details: json })
    }
    res.status(200).json(json)
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'capture error' })
  }
}
