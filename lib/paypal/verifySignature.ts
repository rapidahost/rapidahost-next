// /lib/paypal/verifySignature.ts

import { NextApiRequest } from 'next'
import getRawBody from 'raw-body'
import fetch from 'node-fetch'

export async function verifyPayPalWebhookSignature(req: NextApiRequest): Promise<boolean> {
  try {
    const transmissionId = req.headers['paypal-transmission-id'] as string
    const transmissionTime = req.headers['paypal-transmission-time'] as string
    const certUrl = req.headers['paypal-cert-url'] as string
    const authAlgo = req.headers['paypal-auth-algo'] as string
    const transmissionSig = req.headers['paypal-transmission-sig'] as string
    const webhookId = process.env.PAYPAL_WEBHOOK_ID as string
    const paypalAccessToken = await getPayPalAccessToken()

    const rawBodyBuffer = await getRawBody(req)
    const rawBody = rawBodyBuffer.toString('utf8')

    const verificationPayload = {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody)
    }

    const response = await fetch('https://api-m.paypal.com/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${paypalAccessToken}`
      },
      body: JSON.stringify(verificationPayload)
    })

    const json = await response.json()
    return json.verification_status === 'SUCCESS'
  } catch (err) {
    console.error('PayPal signature verification failed', err)
    return false
  }
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!
  const secret = process.env.PAYPAL_CLIENT_SECRET!
  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64')

  const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })

  const data = await response.json()
  return data.access_token
}
