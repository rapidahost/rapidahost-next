// pages/api/send-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const msg = {
    to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL!,
      name: process.env.SENDGRID_FROM_NAME!,
    },
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('SendGrid Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
