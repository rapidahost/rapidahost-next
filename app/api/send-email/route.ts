// app/api/send-email/route.ts
import { NextResponse } from 'next/server'
import { sendEmailWithSendGrid } from '@/lib/sendgrid'
import { getClient, getInvoice, getService } from '@/lib/whmcs'

export async function POST(req: Request) {
  try {
    const { traceId, clientId, invoiceId, serviceId } = await req.json()

    if (!traceId || !clientId || !invoiceId || !serviceId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // ดึงข้อมูลจาก WHMCS
    const [client, invoice, service] = await Promise.all([
      getClient(clientId),
      getInvoice(invoiceId),
      getService(serviceId),
    ])

    // ตรวจสอบข้อมูล
    if (!client?.email || !client?.firstname || !invoice?.total || !service?.domain) {
      return NextResponse.json({ success: false, error: 'Invalid WHMCS data' }, { status: 500 })
    }

    // เตรียมข้อมูลสำหรับ Dynamic Template ของ SendGrid
    const dynamicData = {
      client_name: `${client.firstname} ${client.lastname}`,
      client_email: client.email,
      invoice_id: invoice.id,
      invoice_total: invoice.total,
      service_name: service.name,
      service_domain: service.domain,
      trace_id: traceId,
    }

    // ส่ง Email
    const emailResult = await sendEmailWithSendGrid({
      to: client.email,
      templateId: process.env.SENDGRID_TEMPLATE_ID!,
      dynamicTemplateData: dynamicData,
    })

    return NextResponse.json({ success: true, emailResult })

  } catch (error) {
    console.error('[SEND_EMAIL_ERROR]', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
