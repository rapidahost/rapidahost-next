// pages/api/paypal/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = req.body;

    // ✅ ประกาศตัวแปรที่ทำให้ build ล้ม
    const orderId: string = body?.orderId || body?.resource?.id || '';
    const requestId: string =
      (req.headers['paypal-transmission-id'] as string) || body?.requestId || '';
    const someContext: any = body?.someContext ?? null;

    console.log('PayPal Webhook', { orderId, requestId, someContext });

    // TODO: verify signature + handle events จริง
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('PayPal Webhook Error:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
