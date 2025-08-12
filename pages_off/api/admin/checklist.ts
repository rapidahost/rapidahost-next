// /pages/api/admin/checklist.ts
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * ตรวจสอบว่า request มาพร้อมกับ ADMIN_API_KEY ถูกต้องหรือไม่
 */
function isAuthorized(req: NextApiRequest) {
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${process.env.ADMIN_API_KEY}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต
  if (!isAuthorized(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ตัวอย่าง logic — ดึง checklist จาก Supabase หรือฐานข้อมูลอื่น
  if (req.method === 'GET') {
    return res.status(200).json({
      checklist: [
        { id: 1, task: 'ตรวจสอบ Stripe Webhook', done: false },
        { id: 2, task: 'ทดสอบ PayPal Webhook', done: true },
      ],
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
