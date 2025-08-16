// src/pages/api/test/whmcs.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  getClientDetails,
  getClientServices,
  getInvoiceDetails,
} from '@/lib/whmcs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const clientId = Number(req.query.clientId || '1')
    const invoiceId = Number(req.query.invoiceId || '1')

    const [client, services, invoice] = await Promise.all([
      getClientDetails(clientId),
      getClientServices(clientId),
      getInvoiceDetails(invoiceId),
    ])

    return res.status(200).json({ client, services, invoice })
  } catch (error: any) {
    console.error('WHMCS Test Error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}

