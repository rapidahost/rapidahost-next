import type { NextApiRequest, NextApiResponse } from 'next'
import { sendEmailWithSendGrid } from '@/lib/sendgrid'

const TEMPLATE_ID = 'd-welcome-xxx' // แทนที่ด้วย SendGrid Template ID จริง

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { email, name } = req.body

    if (!email) return res.status(400).json({ error: 'Missing email' })

    await sendEmailWithSendGrid({
      to: email,
      templateId: TEMPLATE_ID,
      dynamicTemplateData: {
        name: name || 'Customer',
      },
    })

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    return res.status(500).json({ error: 'Failed to send email' })
  }
}

