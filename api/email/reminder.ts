import type { NextApiRequest, NextApiResponse } from 'next';
import { sendEmailWithSendGrid } from '@/lib/sendgrid';
import { getInvoiceDetails, getClientDetails, getClientServices } from '@/lib/whmcs';

const templateMap: Record<string, string> = {
  welcome: 'd-welcome-xxx',
  reminder: 'd-reminder-xxx',
  retry_invoice: 'd-invoice-retry-xxx',
  retry_credential: 'd-credential-retry-xxx',
  notify: 'd-notify-xxx',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { invoiceId, type = 'reminder', password = '' } = req.body;
  if (!invoiceId || !templateMap[type]) {
    return res.status(400).json({ error: 'Missing invoiceId or invalid email type' });
  }

  try {
    const invoice = await getInvoiceDetails(invoiceId);
    const client = await getClientDetails(invoice.clientid);
    const services = await getClientServices(invoice.clientid);

    const primaryService = services?.[0] || {};

    if (!client?.email) throw new Error('Client email not found');

    await sendEmailWithSendGrid({
      to: client.email,
      dynamicTemplateData: {
        subject: `Reminder: Invoice #${invoice.id} is still unpaid`,
        client_name: `${client.firstname} ${client.lastname}`,
        invoice_id: invoice.id,
        amount: invoice.amount,
        status: invoice.status,
        due_date: invoice.duedate,
        invoice_url: `https://billing.rapidahost.com/viewinvoice.php?id=${invoice.id}`,
        password,
        plan_name: primaryService?.productname || '',
        hosting_url: primaryService?.domain || '',
      },
      templateId: templateMap[type]
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Reminder email failed', err);
    res.status(500).json({ error: 'Reminder email failed' });
  }
}
