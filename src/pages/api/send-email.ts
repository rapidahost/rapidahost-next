import type { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';
import { insertLog } from '@/lib/logger';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const { messageId, template, to, subject, html, text, data } = req.body ?? {};
    if (!to) return res.status(400).json({ ok: false, error: 'Missing "to"' });

    const msg: any = {
      to,
      from: process.env.SENDGRID_FROM || 'no-reply@rapidahost.com',
      subject: subject ?? 'Rapidahost notification',
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
    };

    await sendgrid.send(msg);

    await insertLog({
      source: 'email',
      event: 'send-email',
      level: 'INFO',
      status: 'Success',
      message: 'Email sent',
      data: { messageId, template, to, ...(data || {}) },
    });

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    await insertLog({
      source: 'email',
      event: 'send-email',
      level: 'ERROR',
      status: 'Failed',
      message: err?.message || 'sendgrid error',
    });
    return res.status(500).json({ ok: false, error: err?.message || 'send failed' });
  }
}
