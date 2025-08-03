import type { NextApiRequest, NextApiResponse } from 'next';
import { sendEmailWithSendGrid } from '@/lib/sendgrid';
import { getClientDetails, getClientServices } from '@/lib/whmcs';

const TEMPLATE_ID = 'd-welcome-xxx'; // Replace with your actual SendGrid Welcome Template ID

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { clientId, password = '' } = req.body;
  if (!clientId) return res.status(400).json({ error: 'Missing clientId' });

  try {
    const client = await getClientDetails(clientId);
    const services = await getClientServices(clientId);
    const primaryService = services?.[0] || {};

    if (!client?.email) throw new Error('Client email not found');

    await sendEmailWithSendGrid({
      to: client.email,
      templateId: TEMPLATE_ID,
      dynamicTemplateData: {
        client_name: `${client.firstname} ${client.lastname}`,
        email: client.email,
        password,
        plan_name: primaryService?.productname || '',
        hosting_url: primaryService?.domain || '',
      }
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Welcome email failed', err);
    res.status(500).json({ error: 'Welcome email failed' });
  }
}
