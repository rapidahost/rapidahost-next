// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getClient, getInvoice, getService } from '@/lib/whmcs'
import { sendEmailWithSendGrid } from '@/lib/sendgrid'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-08-16' })

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')!
  const rawBody = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('[Webhook] Stripe signature error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const metadata = session.metadata || {}
    const clientId = metadata.client_id
    const invoiceId = metadata.invoice_id
    const serviceId = metadata.service_id

    try {
      const client = await getClient(clientId)
      const invoice = await getInvoice(invoiceId)
      const service = await getService(serviceId)

      await sendEmailWithSendGrid({
        to: client.email,
        subject: 'ยินดีต้อนรับสู่ Rapidahost 🚀',
        templateId: process.env.SENDGRID_TEMPLATE_ID!,
        dynamicTemplateData: {
          name: client.firstname,
          product: service.productname,
          amount: invoice.total,
          invoiceId: invoice.id,
        },
      })

      return NextResponse.json({ received: true })
    } catch (err: any) {
      console.error('[Webhook] Error processing WHMCS or email:', err.message)
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
