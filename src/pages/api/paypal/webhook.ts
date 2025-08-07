// /pages/api/paypal/webhook.ts

import { verifyPayPalWebhookSignature } from '@/lib/paypal/verifySignature'

export default async function handler(req, res) {
  const isValid = await verifyPayPalWebhookSignature(req)
  if (!isValid) return res.status(400).json({ error: 'Invalid signature' })

  // ... ดำเนินการต่อกับ payload จาก PayPal ...
}
