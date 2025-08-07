// /pages/api/test-email.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { sendEmailWithSendGrid } from '@/lib/sendgrid'
import { getClient, getInvoice, getService } from '@/lib/whmcs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const clientId = 3 // ทดสอบด้วย client จริง
    const client = await getClient(clientId)
    const invoice = await getInvoice(clientId)
    const service = await getService(clientId)

    const email = client.email || 'support@rapidahost.com'

    const sent = await sendEmailWithSendGrid({
      to: email,
      client,
      invoice,
      service,
    })

    return res.status(200).json({ success: true, email, sent })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
}
