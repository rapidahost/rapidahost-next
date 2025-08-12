// pages/api/send-email.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { sendEmailWithSendGrid } from '@/lib/email'
import { getClient, getInvoice, getService } from '@/lib/whmcs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  const { clientId, invoiceId, serviceId } = req.body

  if (!clientId || !invoiceId || !serviceId) {
    return res.status(400).json({ message: 'Missing required fields' })
  }

  try {
    // ✅ 1. ดึงข้อมูลจาก WHMCS API
    const client = await getClient(clientId)
    const invoice = await getInvoice(invoiceId)
    const service = await getService(serviceId)

    if (!client || !invoice || !service) {
      return res.status(404).json({ message: 'Client, Invoice, or Service not found' })
    }

    // ✅ 2. เตรียมข้อมูลสำหรับ Dynamic Template (SendGrid)
    const toEmail = client.email
    const dynamicData = {
      client_name: `${client.firstname} ${client.lastname}`,
      invoice_number: invoice.invoicenum || invoice.id,
      invoice_total: invoice.total,
      product_name: service.productname,
      next_due_date: service.nextduedate,
    }

    // ✅ 3. ส่งอีเมล
    await sendEmailWithSendGrid({
      to: toEmail,
      templateId: process.env.SENDGRID_TEMPLATE_ID!,
      dynamicTemplateData: dynamicData,
    })

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('Send Email Error:', error)
    return res.status(500).json({ success: false, error: error.message || 'Unknown error' })
  }
}
