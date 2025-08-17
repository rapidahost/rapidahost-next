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
    traceId = `SIM_PAYPAL_${Date.now()}`
  } = req.body || {}

  try {
    // 1) หา/สร้างลูกค้า
    let clientId: number
    const existing = await whmcsGetClientByEmail(email)
    if (existing?.result === 'success' && existing?.clients?.client?.length) {
  // ดึง id แรกจาก clients
  const first = (existing as any).clients.client[0] as { id: string | number }
  clientId = typeof first.id === 'string' ? parseInt(first.id, 10) : Number(first.id)
} else {
  const created = await whmcsCreateClient({ firstname, lastname, email })
  if (created?.result !== 'success') {
    throw new Error(`WHMCS AddClient failed: ${created?.message || 'unknown'}`)
  }
  clientId = Number(created.clientid)
}
      clientId = typeof created.clientid === 'string'
  ? parseInt(created.clientid, 10)
  : Number(created.clientid);

    }
    await insertLog({ traceId, source: 'whmcs', step: 'whmcs_create_client', status: 'success', data: { clientId, email } } as any)

    // 2) สั่งซื้อ (จำลองว่าจ่ายแล้ว)
    const order = await whmcsAddOrder({
      clientid: clientId,
      pid: plan_id,
      billingcycle: billing_cycle,
      paymentmethod: 'paypal',
      promocode,
      noinvoice: true,
      noemail: false,
    })
    if (order?.result !== 'success') throw new Error(`WHMCS AddOrder failed: ${order?.message || 'unknown'}`)
    await insertLog({ traceId, source: 'whmcs', step: 'whmcs_place_order', status: 'success', data: { orderId: order.orderid } } as any)

    // 3) ส่งอีเมล
    await sendEmailWithTemplate({
      to: email,
      dynamicData: { firstname, lastname, plan_id, billing_cycle, order_id: order.orderid, gateway: 'PayPal (Simulated)' }
    })
    await insertLog({ traceId, source: 'email', step: 'email_sent', status: 'success' } as any)

    return res.status(200).json({ ok: true, traceId, orderId: order.orderid })
  } catch (e: any) {
    await insertLog({ traceId, source: 'system', step: 'error', status: 'failed', message: e.message || 'simulate paypal error' } as any)
    return res.status(500).json({ error: e.message || 'simulate error' })
  }
}

