// pages/api/paypal/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { buffer } from 'micro'
import { verifyPayPalSignature } from '@/lib/paypal/verifySignature'
import { insertLog } from '@/lib/log'
import { whmcsGetClientByEmail, whmcsCreateClient, whmcsAddOrder } from '@/lib/whmcs'
import { sendEmailWithTemplate } from '@/lib/sendgrid'

export const config = { api: { bodyParser: false } }

type OrderContext = {
  traceId: string
  planId: number
  billingCycle: 'monthly'|'quarterly'|'semiannually'|'annually'|'biennially'|'triennially'
  promocode?: string
  email: string
  firstname: string
  lastname: string
}

/**
 * พยายามดึง metadata จาก PayPal webhook หลายรูปแบบ:
 * - resource.purchase_units[0].custom_id (แนะนำให้ส่ง JSON ตอนสร้าง order ฝั่ง client/server)
 * - resource.custom_id
 * - fallback: ดึงจาก payer / shipping
 */
function extractOrderContext(evt: any): OrderContext {
  const r = evt?.resource || {}
  const pu = Array.isArray(r.purchase_units) ? r.purchase_units[0] : null

  // 1) ลองอ่าน custom_id เป็น JSON ก่อน
  let meta: any = {}
  const rawCustom = pu?.custom_id || r?.custom_id
  if (rawCustom) {
    try { meta = typeof rawCustom === 'string' ? JSON.parse(rawCustom) : rawCustom } catch {}
  }

  // 2) ข้อมูลจากผู้ชำระเงิน
  const payer = r.payer || evt?.payer || {}
  const email = meta.email || payer.email_address || ''
  const nameObj = payer.name || {}
  const given = meta.firstname || nameObj.given_name || ''
  const sur = meta.lastname || nameObj.surname || ''

  // 3) คีย์สำคัญ (ให้ default แบบปลอดภัย)
  const planId = Number(meta.plan_id || meta.pid || pu?.reference_id || 0)
  const billingCycle = (meta.billing_cycle || meta.billingCycle || 'monthly').toLowerCase()
  const promocode = meta.promocode || meta.coupon || ''

  const traceId =
    meta.traceId ||
    pu?.invoice_id ||
    r?.id ||
    `paypal_${evt?.id || Date.now()}`

  return {
    traceId,
    planId: isNaN(planId) ? 0 : planId,
    billingCycle: (['monthly','quarterly','semiannually','annually','biennially','triennially'].includes(billingCycle) ? billingCycle : 'monthly') as any,
    promocode: promocode || undefined,
    email,
    firstname: given || 'Customer',
    lastname: sur || '',
  }
}

async function ensureWhmcsClient(email: string, firstname: string, lastname: string): Promise<number> {
  // find
  const existing = await whmcsGetClientByEmail(email)
  if (existing?.result === 'success' && existing?.clients?.client?.length) {
    return parseInt(existing.clients.client[0].id, 10)
  }
  // create
  const created = await whmcsCreateClient({ firstname, lastname, email })
  if (created?.result !== 'success') throw new Error(`WHMCS AddClient failed: ${created?.message || 'unknown'}`)
  return parseInt(created.clientid, 10)
}

async function placeWhmcsOrder(clientId: number, ctx: OrderContext) {
  const order = await whmcsAddOrder({
    clientid: clientId,
    pid: ctx.planId,
    billingcycle: ctx.billingCycle,
    paymentmethod: 'paypal',   // ให้ตรงกับชื่อ gateway ใน WHMCS ของคุณ
    promocode: ctx.promocode,
    noinvoice: true,           // จ่ายแล้วที่ PayPal ไม่ต้องออก invoice ซ้ำ
    noemail: false,
  })
  if (order?.result !== 'success') throw new Error(`WHMCS AddOrder failed: ${order?.message || 'unknown'}`)
  return order
}

async function sendCustomerEmail(ctx: OrderContext, orderId: any) {
  try {
    await sendEmailWithTemplate({
      to: ctx.email,
      dynamicData: {
        firstname: ctx.firstname,
        lastname: ctx.lastname,
        plan_id: ctx.planId,
        billing_cycle: ctx.billingCycle,
        order_id: orderId,
        gateway: 'PayPal',
      },
    })
  } catch (e) {
    // ไม่ให้ fail ทั้ง webhook เพราะอีเมล ส่ง log ไว้แทน
    await insertLog({
      traceId: ctx.traceId,
      source: 'email',
      step: 'email_sent',
      status: 'failed',
      message: (e as any)?.message || 'sendgrid error',
    })
  }
}

export default async function handler(req: NextApiRequest & { rawBody?: Buffer }, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // รับ raw body
  const rawBody = (req as any).rawBody || (await buffer(req))
  let bodyJson: any
  try {
    bodyJson = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const eventType: string = bodyJson?.event_type || ''
  const ok = await verifyPayPalSignature(req.headers as any, bodyJson)

  if (!ok) {
    await insertLog({
      traceId: `paypal_${Date.now()}`,
      source: 'paypal',
      step: 'webhook_verified',
      status: 'failed',
      message: 'Invalid PayPal signature',
      data: { event_type: eventType },
    })
    return res.status(400).json({ error: 'Invalid PayPal signature' })
  }

  // ✔ ถึงจุดนี้ ลายเซ็นถูกต้อง
  const ctx = extractOrderContext(bodyJson)

  await insertLog({
    traceId: ctx.traceId,
    source: 'paypal',
    step: 'webhook_received',
    status: 'success',
    data: { event_type: eventType },
  })

  // ตัดสินใจจาก event_type
  try {
    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED': {
        // อนุมัติแล้ว (ผู้ใช้กดอนุมัติใน PayPal) — ยังไม่การันตีว่า capture สำเร็จ
        // คุณอาจเลือก "รอ" จนกว่าจะได้ PAYMENT.CAPTURE.COMPLETED ค่อย provision
        await insertLog({
          traceId: ctx.traceId,
          source: 'system',
          step: 'webhook_received',
          status: 'success',
          message: 'Order approved. Waiting for capture to complete.',
        })
        break
      }

      case 'PAYMENT.CAPTURE.COMPLETED': {
        // ✅ ชำระเสร็จสมบูรณ์ — เดิน flow สร้างบริการ
        if (!ctx.email || !ctx.planId) {
          throw new Error('Missing email or plan_id in PayPal metadata (custom_id). Make sure you set custom_id JSON when creating order.')
        }

        // 1) หา/สร้างลูกค้าใน WHMCS
        const clientId = await ensureWhmcsClient(ctx.email, ctx.firstname, ctx.lastname)
        await insertLog({ traceId: ctx.traceId, source: 'whmcs', step: 'whmcs_create_client', status: 'success', data: { clientId, email: ctx.email } })

        // 2) ออกคำสั่งซื้อ (ไม่ออกใบแจ้งหนี้ เพราะรับชำระแล้ว)
        const order = await placeWhmcsOrder(clientId, ctx)
        await insertLog({ traceId: ctx.traceId, source: 'whmcs', step: 'whmcs_place_order', status: 'success', data: { orderId: order.orderid, productids: order.productids } })

        // 3) ส่งอีเมลยืนยัน
        await sendCustomerEmail(ctx, order.orderid)
        await insertLog({ traceId: ctx.traceId, source: 'email', step: 'email_sent', status: 'success' })

        // 4) ปิดจบ
        await insertLog({ traceId: ctx.traceId, source: 'system', step: 'completed', status: 'success', message: 'PayPal → WHMCS → Email flow completed' })
        break
      }

      default: {
        // เหตุการณ์อื่น ๆ เก็บ log ไว้เฉย ๆ
        await insertLog({
          traceId: ctx.traceId,
          source: 'paypal',
          step: 'webhook_received',
          status: 'success',
          message: `Unhandled event_type: ${eventType}`,
        })
        break
      }
    }

    return res.status(200).json({ received: true })
  } catch (err: any) {
    await insertLog({
      traceId: ctx.traceId,
      source: 'system',
      step: 'error',
      status: 'failed',
      message: err.message || 'paypal handler error',
    })
    return res.status(500).json({ error: 'Webhook handling failed' })
  }
}
