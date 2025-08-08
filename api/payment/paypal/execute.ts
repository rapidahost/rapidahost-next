// api/payment/paypal/execute.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import paypal from '@paypal/checkout-server-sdk'
import { sendEmailWithSendGrid } from '@/lib/email/sendEmailWithSendGrid'
import { logEvent } from '@/lib/logging/logEvent'
// (ถ้าในฟลโว์คุณต้องสร้าง client/invoice ที่ WHMCS หลังจ่ายเงิน ให้เปิดใช้)
// import { createWHMCSClientAndInvoice } from '@/lib/whmcs/createWHMCSClientAndInvoice'

const clientId = process.env.PAYPAL_CLIENT_ID!
const clientSecret = process.env.PAYPAL_CLIENT_SECRET!

function getPayPalClient() {
  const env =
    process.env.PAYPAL_ENV === 'live'
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret)

  return new paypal.core.PayPalHttpClient(env)
}

type ExecuteBody = {
  orderId?: string
  payerEmail: string
  clientId?: string | number
  invoiceId?: string | number
  serviceId?: string | number
  amount?: string | number
  currency?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const {
    orderId,
    payerEmail,
    clientId: cid,
    invoiceId,
    serviceId,
    amount,
    currency = 'USD',
  } = (req.body || {}) as ExecuteBody

  if (!payerEmail) return res.status(400).json({ error: 'Missing payerEmail' })

  try {
    await logEvent({
      level: 'info',
      event: 'paypal.execute.started',
      source: 'paypal',
      payload: { orderId, payerEmail, clientId: cid, invoiceId, serviceId, amount, currency },
    })

    // 1) (ถ้าได้รับ orderId) ทำการ capture ที่ฝั่ง server
    if (orderId) {
      const client = getPayPalClient()
      const request = new paypal.orders.OrdersCaptureRequest(orderId)
      request.requestBody({})

      const response = await client.execute(request)

      await logEvent({
        level: 'info',
        event: 'paypal.execute.captured',
        source: 'paypal',
        payload: {
          orderId,
          statusCode: response?.statusCode,
          resultStatus: (response?.result as any)?.status,
        },
      })

      if (!response || response.statusCode < 200 || response.statusCode >= 300) {
        await logEvent({
          level: 'error',
          event: 'paypal.execute.capture_failed',
          source: 'paypal',
          payload: { orderId, statusCode: response?.statusCode, result: response?.result },
        })
        return res.status(502).json({ error: 'PayPal capture failed' })
      }
    }

    // 2) (ตัวเลือก) หากต้องสร้างลูกค้า/อินวอยซ์ใน WHMCS ที่นี่
    // const { clientId: newCid, invoiceId: newInvoiceId } = await createWHMCSClientAndInvoice({...})

    // 3) ส่งอีเมลยืนยัน/แจ้งเตือน
    await sendEmailWithSendGrid({
      to: payerEmail,
      templateId:
        process.env.SENDGRID_TEMPLATE_ID_ORDER_CONFIRM ||
        process.env.SENDGRID_TEMPLATE_ID,
      // ใส่ข้อมูลที่ template ต้องใช้ใน dynamicTemplateData
      dynamicTemplateData: {
        clientId: cid,
        invoiceId,
        serviceId,
        amount,
        currency,
      },
      // ถ้าไม่ได้ใช้ template และอยากส่งแบบ subject+html ให้ใช้ด้านล่างแทน:
      // subject: 'Payment received',
      // html: `<p>Thanks for your order.</p>
      //        <p>Client: ${cid} | Invoice: ${invoiceId} | Service: ${serviceId}</p>
      //        <p>Amount: ${amount} ${currency}</p>`,
    })

    await logEvent({
      level: 'info',
      event: 'email.order_confirm.sent',
      source: 'sendgrid',
      payload: { to: payerEmail, clientId: cid, invoiceId, serviceId, amount, currency },
    })

    return res.status(200).json({
      success: true,
      message: 'Payment executed and email sent',
      data: { clientId: cid, invoiceId, serviceId, amount, currency },
    })
  } catch (err: any) {
    await logEvent({
      level: 'error',
      event: 'paypal.execute.error',
      source: 'paypal',
      payload: { message: err?.message || String(err) },
      meta: { stack: err?.stack },
    })
    return res.status(500).json({ error: err?.message || 'Unknown error' })
  }
}
