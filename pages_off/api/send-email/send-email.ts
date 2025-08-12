// pages/api/send-email.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { sendEmailWithSendGrid } from '@/lib/email'
import { getClient, getInvoice, getService } from '@/lib/whmcs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { clientId, invoiceId, serviceId } = req.body

    if (!clientId || !invoiceId || !serviceId) {
      return res.status(400).json({ error: 'Missing parameters' })
    }

    const [client, invoice, service] = await Promise.all([
      getClient(clientId),
      getInvoice(invoiceId),
      getService(serviceId),
    ])

    if (!client || !invoice || !service) {
      return res.status(404).json({ error: 'WHMCS data not found' })
    }

    const emailData = {
      to: client.email,
      dynamicTemplateData: {
        fullName: `${client.firstname} ${client.lastname}`,
        invoiceNumber: invoice.invoicenum || invoice.id,
        invoiceTotal: invoice.total,
        invoiceDate: invoice.date,
        productName: service.productname,
        nextDueDate: service.nextduedate,
        domain: service.domain || '-',
        status: service.status,
        rapidahostUrl: 'https://rapidahost.com',
        billingPortalUrl: 'https://billing.rapidahost.com/viewinvoice.php?id=' + invoice.id,
      },
    }

    await sendEmailWithSendGrid(emailData)

    return res.status(200).json({ success: true })
  } catch (err: any) {
    console.error('[send-email] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
