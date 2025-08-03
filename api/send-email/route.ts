import { NextRequest, NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function POST(req: NextRequest) {
  const { to, name, email, password } = await req.json()

  if (!to || !name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const msg = {
      to,
      from: 'support@rapidahost.com', // sender must be verified
      templateId: 'd-70e6c90d73684487827f76846def9c91',
      dynamicTemplateData: {
        name,
        email,
        password: password || '********' // fallback if empty
      }
    }

    await sgMail.send(msg)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('SendGrid Error:', error.response?.body || error.message)
    return NextResponse.json({ error: 'Email failed to send' }, { status: 500 })
  }
}
