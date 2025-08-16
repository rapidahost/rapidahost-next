import type { NextApiRequest, NextApiResponse } from 'next'
import { insertLog } from '@/lib/logs'
import { whmcsGetClientByEmail, whmcsCreateClient, whmcsAddOrder } from '@/lib/whmcs'
import { sendEmailWithTemplate } from '@/lib/sendgrid'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_API_KEY) return res.status(403).json({ error: 'Forbidden' })
  if (req.method !== 'POST') return res.status(405).end()

  const {
    email = 'sandbox@example.com',
    firstname = 'Test',
    lastname = 'User',
    plan_id = 1,
    billing_cycle = 'monthly',
    promocode = '',
    traceId = `SIM_STRIPE_${Date.now()}`
  } = req.body || {}

  try {
    // 1) หา/สร้างลูกค้า
    let clientId: number
    const existing = await whmcsGetClientByEmail(email)
    if (existing?.result === 'success' && existing?.clients?.client?.length) {
      clientId = parseInt(existing.clients.client[0].id, 10)
    } else {
      const created = await whmcsCreateClient({ firstname, lastname, email })
      if (created?.result !== 'success') throw new Error(`WHMCS AddClient failed: ${created?.message || 'unknown'}`)
      clientId = parseInt(created.clientid, 10)
    }
    await insertLog({ traceId, source: 'whmcs', step: 'whmcs_create_client', status: 'success', data: { clientId, email } } as any)

    // 2) สั่งซื้อ (จำลองว่าจ่ายแล้วทาง Stripe)
    const order = await whmcsAddOrder({
      clientid: clientId,
      pid: plan_id,
      billingcycle: billing_cycle,
      paymentmethod: 'stripe',
      promocode,
      noinvoice: true,
      noemail: false,
    })
    if (order?.result !== 'success') throw new Error(`WHMCS AddOrder failed: ${order?.message || 'unknown'}`)
    await insertLog({ traceId, source: 'whmcs', step: 'whmcs_place_order', status: 'success', data: { orderId: order.orderid } } as any)

    // 3) ส่งอีเมล
    await sendEmailWithTemplate({
      to: email,
      dynamicData: { firstname, lastname, plan_id, billing_cycle, order_id: order.orderid, gateway: 'Stripe (Simulated)' }
    })
    await insertLog({ traceId, source: 'email', step: 'email_sent', status: 'success' } as any)

    return res.status(200).json({ ok: true, traceId, orderId: order.orderid })
  } catch (e: any) {
    await insertLog({ traceId, source: 'system', step: 'error', status: 'failed', message: e.message || 'simulate stripe error' } as any)
    return res.status(500).json({ error: e.message || 'simulate error' })
  }
}

