import { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    email,
    name,
    plan_id,
    invoiceId,
    invoiceUrl,
    serviceId,
    password, // ← รับค่าที่เพิ่มมา
  } = req.body;

  try {
    const hasPassword = !!password;

    const htmlBody = `
      <p>สวัสดีคุณ ${name},</p>
      <p>ขอบคุณที่สมัครใช้งาน Rapidahost</p>
      <ul>
        <li>แพ็กเกจ: ${plan_id}</li>
        <li>หมายเลข Invoice: <a href="${invoiceUrl}">${invoiceId}</a></li>
        <li>บริการของคุณ: #${serviceId}</li>
        ${hasPassword ? `<li><b>รหัสผ่านชั่วคราว:</b> ${password}</li>` : ''}
      </ul>
      ${hasPassword ? `<p>กรุณาเข้าสู่ระบบและเปลี่ยนรหัสผ่านทันทีเพื่อความปลอดภัย</p>` : ''}
    `;

    await sendgrid.send({
      to: email,
      from: 'support@rapidahost.com',
      subject: hasPassword ? `Welcome to Rapidahost – Your Login Details` : `Service Activated – Invoice #${invoiceId}`,
      html: htmlBody,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Failed to send email:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
}
