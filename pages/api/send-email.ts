import type { NextApiRequest, NextApiResponse } from 'next';

type Body = {
  messageId?: string;
  template?: string;
  to?: string;
  text?: string;
} | undefined;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const body = req.body as Body;

  // validation ขั้นพื้นฐาน
  if (!body?.to || (!body.text && !body.template)) {
    return res.status(400).json({ ok: false, error: 'to และ text/template จำเป็น' });
  }

  // TODO: ตรงนี้ค่อยเชื่อมผู้ให้บริการอีเมลจริง (SendGrid/Resend/ฯลฯ)
  // ตอนนี้ตอบกลับเฉย ๆ เพื่อยืนยันว่า route ทำงาน
  return res.status(200).json({
    ok: true,
    messageId: body.messageId ?? 'dev-test',
    to: body.to,
    template: body.template ?? null,
    text: body.text ?? null,
  });
}
