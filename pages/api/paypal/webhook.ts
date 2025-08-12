// pages/api/paypal/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyPayPalSignature } from '@/lib/paypal/verifySignature'
import { insertLog } from '@/lib/log'

export const config = { api: { bodyParser: false } }

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const raw = await getRawBody(req)
    const body = JSON.parse(raw.toString('utf8'))

    const ok = await verifyPayPalSignature(req.headers as any, body)
    if (!ok) {
      await insertLog?.({ traceId: `paypal_${Date.now()}`, source: 'paypal', step: 'webhook_verified', status: 'failed', message: 'Invalid PayPal signature' } as any)
      return res.status(400).json({ error: 'Invalid PayPal signature' })
    }

    // … ที่เหลือตามโค้ด map event_type → WHMCS/Email/Logs ของคุณ …
    return res.status(200).json({ received: true })
  } catch (e) {
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
