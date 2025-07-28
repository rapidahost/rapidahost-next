// app/api/webhook/route.js
import { buffer } from 'micro';
import Stripe from 'stripe';
import { createWhmcsClient } from '@/lib/whmcs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const buf = await req.arrayBuffer();
  const rawBody = Buffer.from(buf);
  const sig = req.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata;

    try {
      await createWhmcsClient({
        email: session.customer_email,
        plan_id: metadata.plan_id,
        description: metadata.description,
      });
      console.log('✅ Created client in WHMCS');
    } catch (err) {
      console.error('WHMCS Error:', err.message);
    }
  }

  return new Response('Webhook received', { status: 200 });
}
