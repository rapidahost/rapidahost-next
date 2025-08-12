// pages/api/checkout/stripe.ts — ใช้ REST (ไม่ต้องติดตั้ง stripe)
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const {
      traceId, plan_id, billing_cycle, email, firstname, lastname,
      promocode, amount_cents, item_name, currency_code
    } = req.body || {}

    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'STRIPE_SECRET_KEY missing' })
    if (!amount_cents || amount_cents < 50) return res.status(400).json({ error: 'amount_cents must be >= 50' })

    const currency = String(currency_code || 'usd').toLowerCase()

    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.append('payment_method_types[]', 'card')
    if (email) params.set('customer_email', email)
    params.set('success_url', `${req.headers.origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${req.headers.origin}/billing?canceled=1`)
    // line item
    params.set('line_items[0][price_data][currency]', currency)
    params.set('line_items[0][price_data][unit_amount]', String(amount_cents))
    params.set('line_items[0][price_data][product_data][name]', item_name || `Plan #${plan_id} (${billing_cycle})`)
    params.set('line_items[0][quantity]', '1')
    // metadata
    if (traceId) params.set('metadata[traceId]', String(traceId))
    if (plan_id != null) params.set('metadata[plan_id]', String(plan_id))
    if (billing_cycle) params.set('metadata[billing_cycle]', String(billing_cycle))
    if (firstname) params.set('metadata[firstname]', String(firstname))
    if (lastname) params.set('metadata[lastname]', String(lastname))
    if (promocode) params.set('discounts[0][promotion_code]', String(promocode)) // ใช้ Promotion Code ของ Stripe (ถ้ามี)

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    })

    const json = await resp.json()
    if (!resp.ok) return res.status(resp.status).json({ error: json?.error?.message || 'stripe create session failed', details: json })
    return res.status(200).json({ url: json.url })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'create checkout error' })
  }
}
