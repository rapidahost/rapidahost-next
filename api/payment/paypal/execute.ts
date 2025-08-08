// pages/api/payment/paypal/execute.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import paypal from '@paypal/checkout-server-sdk'
import { sendEmailWithSendGrid } from '@/lib/email/sendEmailWithSendGrid'
import { logEvent } from '@/lib/logging/logEvent'

// (ถ้ามีใช้) สร้างลูกค้า + invoice ใน WHMCS หลังจ่ายเงิน
// import { createWHMCSClientAndInvoice } from '@/lib/whmcs/createClientInvoice'

const clientId = process.env.PAYPAL_CLIENT_ID!
const clientSecret = process.env.PAYPAL_CLIENT_SECRET!

function getPayPalClient() {
  const env =
    process.env.PAYPAL_ENV === 'live'
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret)
  return new paypal.core.PayPalHttpClient(env)
}

/**
 * รับข้อมูลจากหน้าเช็คเอาท์ (หรือ Webhook) -> capture / verify -> ส่งอีเมล
 * คุณปรับ body/schema ตามของจริงได้เลย จุดสำคัญคือการส่ง metadata อยู่ใน dynamicTemplateData
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  try {
    const {
      orderId,          // PayPal orderId หากคุณ capture ฝั่ง server
      payerEmail,       // อีเมลผู้จ่าย
      clientId: cid,    // ไอดีลูกค้าจากระบบคุณ/WHMCS
      invoiceId,        // ไอดีอินวอยซ์จาก WHMCS (ถ้ามี)
      serviceId,        // ไอดีบริการ
      amount,           // จำนวนเงิน
      currency = 'USD', // สกุลเงิน
    } = req.body || {}

    // --- (ตัวอย่าง) ตรวจค่าขั้นต่ำ ---
    if (!payerEmail) return res.status(400).json({ error: 'Missing payerEmail' })

    // --- (ตัวอย่าง) capture PayPal order ถ้าคุณต้องการทำที่นี่ ---
    if (orderId) {
      const client = getPayPalClient()
      const request = new paypal.orders.OrdersCaptureRequest(orderId)
      request.requestBody({})
      const response = await client.execute(request)

      await logEvent({
        event: 'paypal.capture.completed',
        level: 'info',
        payload: { orderId, status: response?.statusCode, result: response?.result },
      })

      if (response?.statusCode < 200 || response?.statusCode >= 300) {
        return res.status(502).json({ error: 'PayPal capture failed', detail: response })
      }
    }

    // --- (ถ้ามี flow สร้างลูกค้า/Invoice ใน WHMCS) ---
    // const whmcs = await createWHMCSClientAndInvoice({ ... })
    // const createdInvoiceId = whmcs?.invoiceId || invoiceId

    // --- ส่งอีเมลยืนยัน: ใช้ Dynamic Template หรือ subject+html ก็ได้ ---
    await sendEmailWithSendGrid({
      to: payerEmail,
      templateId:
        process.env.SENDGRID_TEMPLATE_ID_ORDER_CONFIRM ||
        process.env.SENDGRID_TEMPLATE_ID, // fallback ถ้าใช้ template ตัวเดียว
      dynamicTemplateData: {
        clientId: cid,
        invoiceId,
        serviceId,
        amount,
        currency,
        // เพิ่ม field อื่น ๆ ที่ template ใช้ได้ตามต้องการ
      },
      // ถ้าไม่ใช้ template ให้ใช้แบบ subject/html:
      // subject: 'Payment received',
      // html: `<p>Thanks for your order.</p>
      //        <p>Client: ${cid} | Invoice: ${invoiceId} | Service: ${serviceId}</p>
      //        <p>Amount: ${amount} ${currency}</p>`,
    })

    await logEvent({
      event: 'email.order_confirm.sent',
      level: 'info',
      payload: { to: payerEmail, clientId: cid, invoiceId, serviceId, amount, currency },
    })

    return res.status(200).json({
      success: true,
      message: 'Payment executed and email sent',
      data: { clientId: cid, invoiceId, serviceId, amount, currency },
    })
  } catch (err: any) {
    await logEvent({
      event: 'paypal.execute.error',
      level: 'error',
      payload: { message: err?.message || String(err) },
    })
    return res.status(500).json({ error: err?.message || 'Unknown error' })
  }
}
