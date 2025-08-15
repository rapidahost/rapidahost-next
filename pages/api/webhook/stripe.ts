
// pages/api/webhook/stripe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { ENV } from '../../../lib/env';            // ปรับ path ให้ถูกกับโปรเจกต์
import { insertLog } from '../../../lib/logger';

export const config = { api: { bodyParser: false } }; // สำคัญ

function buffer(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-06-20' });

  let event: Stripe.Event;
  try {
    const rawBody = await buffer(req);
    const sig = req.headers['stripe-signature'] as string;
    event = stripe.webhooks.constructEvent(rawBody, sig, ENV.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    await insertLog({ source:'stripe-webhook', event:'signature-verification-failed', status:'Failed', message: err?.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const traceId = session.client_reference_id || session.id;
      await insertLog({ traceId, source:'stripe-webhook', event:'checkout.session.completed', message:'received', data:{ sessionId: session.id, metadata: session.metadata }});
      // TODO: WHMCS → Email ตาม flow ของคุณ
    }
    return res.status(200).json({ received: true });
  } catch (err: any) {
    await insertLog({ source:'stripe-webhook', event:'handler-error', status:'Failed', message: err?.message, data:{ type: (event as any)?.type, stack: err?.stack }});
    return res.status(500).json({ error: 'Webhook handling failed' });
  }
}
