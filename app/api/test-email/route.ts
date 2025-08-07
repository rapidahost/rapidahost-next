// File: /app/api/test-email/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { sendEmailWithSendGrid } from '@/lib/sendgrid'

export async function GET(req: NextRequest) {
  try {
    const to = 'support@rapidahost.com'

    const mockData = {
      client: {
        id: 3,
        firstname: 'เสริมศักดิ์',
        lastname: 'Rapidahost',
        email: 'support@rapidahost.com',
      },
      invoice: {
        id: 1001,
        total: '299.00',
        duedate: '2025-08-08',
        status: 'Unpaid',
        url: 'https://billing.rapidahost.com/viewinvoice.php?id=1001',
      },
      service: {
        id: 2001,
        name: 'WordPress Hosting Pro',
        domain: 'clientsite.com',
        status: 'Pending',
      },
    }

    const result = await sendEmailWithSendGrid({
      to,
      client: mockData.client,
      invoice: mockData.invoice,
      service: mockData.service,
      templateId: process.env.SENDGRID_TEMPLATE_PRODUCTION_ID!,
    })

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
