// pages/api/checkout/stripe.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { traceId, plan_id, billing_cycle, email, firstname, lastname, promocode, amount_cents, item_name } = req.body
    if (!amount_cents || amount_cents < 50) return res.status(400).json({ error: 'amount_cents must be >= 50' })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [{
        price_data: { currency: 'usd', unit_amount: amount_cents, product_data: { name: item_name || `Plan #${plan_id} (${billing_cycle})` } },
        quantity: 1,
      }],
      success_url: `${req.headers.origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/billing?canceled=1`,
      metadata: {
        traceId,
        plan_id: String(plan_id),
        billing_cycle: String(billing_cycle),
        promocode: promocode || '',
        firstname: firstname || '',
        lastname: lastname || '',
      },
    })

    res.status(200).json({ url: session.url })
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'create checkout error' })
  }
}
