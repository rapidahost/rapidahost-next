import type { NextApiRequest, NextApiResponse } from 'next'
import { buffer } from 'micro'
import { logEvent } from '@/lib/logging/logEvent'
// import { createWHMCSClientAndInvoice } from '@/lib/whmcs/createWHMCSClientAndInvoice'
import { queueRetry } from '@/lib/retry/queueRetry'

export const config = { api: { bodyParser: false } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  try {
    const sigHeader = req.headers['paypal-transmission-sig'] as string
    const bodyStr = (await buffer(req)).toString()

    // TODO: ใช้ PayPal SDK/WEBHOOK verify จริงในโปรดักชัน
    const isValid = Boolean(sigHeader && bodyStr)
    if (!isValid) {
      await logEvent({
        level: 'error',
        event: 'paypal.webhook.failed',
        source: 'paypal',
        payload: { status: 'failed', message: 'Invalid PayPal signature' },
        meta: { traceId: 'paypal_invalid_sig' },
      })
      return res.status(400).json({ error: 'Invalid PayPal signature' })
    }

    const webhookEvent = JSON.parse(bodyStr)

    await logEvent({
      level: 'info',
      event: 'paypal.webhook.received',
      source: 'paypal',
      payload: webhookEvent,
    })

    // ตัวอย่างกรณีสำเร็จ
    // if (webhookEvent.event_type === 'CHECKOUT.ORDER.APPROVED') {
    //   const { clientId, invoiceId } = await createWHMCSClientAndInvoice({...})
    //   await logEvent({
    //     level: 'info',
    //     event: 'paypal.invoice.created',
    //     source: 'paypal',
    //     payload: { clientId, invoiceId },
    //   })
    // }

    return res.status(200).json({ received: true })
  } catch (err: any) {
    await logEvent({
      level: 'error',
      event: 'paypal.webhook.error',
      source: 'paypal',
      payload: { message: err?.message || String(err) },
      meta: { stack: err?.stack },
    })

    await queueRetry({
      type: 'webhook',
      reason: 'webhook_failed',
      payload: { path: req.url, method: req.method },
      delaySeconds: 60,
    })

    return res.status(500).json({ error: 'Webhook handler error' })
  }
}
