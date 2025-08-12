// pages/api/email/retry.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendEmailWithSendGrid } from '@/lib/sendgrid';
import { getWHMCSClient, getWHMCSInvoice, getWHMCSService } from '@/lib/whmcs';
import { logEvent } from '@/lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messageId, clientId, invoiceId, service } = req.body;

  if (!clientId || !invoiceId || !messageId || !service) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [client, invoice, hosting] = await Promise.all([
      getWHMCSClient(clientId),
      getWHMCSInvoice(invoiceId),
      getWHMCSService(service),
    ]);

    if (!client || !invoice || !hosting) {
      return res.status(404).json({ error: 'Unable to fetch WHMCS records' });
    }

    const sendResult = await sendEmailWithSendGrid({
      to: client.email,
      subject: `Retry: Invoice #${invoiceId} and Service Details`,
      html: `
        <p>Client: ${client.firstname} ${client.lastname}</p>
        <p>Invoice Total: ${invoice.total}</p>
        <p>Product: ${hosting.productname}</p>
        <p>Status: ${hosting.status}</p>
      `,
      messageId,
    });

    await logEvent('email.retry', {
      clientId,
      invoiceId,
      service,
      messageId,
      sendResult,
      retry: true,
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    await logEvent('email.retry.failed', {
      error: error.message,
      clientId,
      invoiceId,
      service,
      messageId,
    });
    return res.status(500).json({ error: 'Retry failed' });
  }
}
