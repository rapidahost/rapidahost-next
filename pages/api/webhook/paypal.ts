// ตัวอย่าง Handler สำหรับ PayPal Webhook ที่เชื่อม WHMCS และส่ง Welcome Email
import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import { createWHMCSClientAndInvoice } from '@/lib/whmcs';
import { logEvent } from '@/lib/logging';
import { verifyPayPalWebhookSignature } from '@/lib/paypal';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await buffer(req);
  const signatureVerification = await verifyPayPalWebhookSignature(req.headers, rawBody);

  if (!signatureVerification.valid) {
    console.warn('Invalid PayPal Webhook Signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(rawBody.toString());

  if (payload.event_type !== 'PAYMENT.CAPTURE.COMPLETED') return res.status(200).end();

  const metadata = payload.resource.custom_id ? JSON.parse(payload.resource.custom_id) : {};

  try {
    const result = await createWHMCSClientAndInvoice({
      email: metadata.email,
      payment_method: 'paypal',
      plan_id: metadata.plan_id,
      billingcycle: metadata.billingcycle,
      promocode: metadata.promocode
    });

    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/email/welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: result.clientId,
        password: result.password || ''
      })
    });

    await logEvent({
      type: 'paypal',
      subtype: 'checkout.success',
      traceId: payload.id,
      clientId: result.clientId,
      invoiceId: result.invoiceId,
      status: 'success',
      meta: { payer: payload.resource.payer, amount: payload.resource.amount }
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('PayPal Webhook Error', err);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
}
