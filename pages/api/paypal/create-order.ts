// pages/api/paypal/create-order.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getPayPalAccessToken, getApiBase } from '@/lib/paypal/client'

type CreateOrderBody = {
  amount_cents: number;         // เช่น 990 = 9.90
  currency_code: string;        // 'USD' | 'THB' | ...
  context: {
    traceId: string;
    plan_id: number;
    billing_cycle: 'monthly'|'quarterly'|'semiannually'|'annually'|'biennially'|'triennially';
    promocode?: string;
    email: string;
    firstname: string;
    lastname: string;
  };
};

// สร้าง PayPal Order (intent=CAPTURE)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { amount_cents, currency_code, context } = req.body as CreateOrderBody;

    if (!amount_cents || !currency_code || !context?.traceId) {
      return res.status(400).json({ error: 'missing amount_cents / currency_code / context.traceId' });
    }

    // PayPal ต้องการรูปแบบทศนิยมเป็นสตริง 2 ตำแหน่ง
    const value = (amount_cents / 100).toFixed(2);

    const token = await getPayPalAccessToken();
    const resp = await fetch(`${getApiBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code, value },
          // custom_id จำกัด ~127 ตัวอักษร ถ้า metadata ยาว แนะนำใส่เฉพาะ keys สำคัญหรือบีบอัด/ย้ายไป store แล้วอ้างอิง traceId
          custom_id: JSON.stringify({
            traceId: context.traceId,
            plan_id: context.plan_id,
            billing_cycle: context.billing_cycle,
            promocode: context.promocode || '',
            email: context.email,
            firstname: context.firstname,
            lastname: context.lastname,
          }).slice(0, 127),
          // ออปชั่น: ตั้ง reference_id หรือ invoice_id เพื่อให้หาง่ายในรายงาน
          reference_id: String(context.plan_id),
          invoice_id: context.traceId, // ใช้ traceId ช่วยตามรอย
        }],
        application_context: {
          brand_name: 'Rapidahost',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          // ถ้าใช้หน้า PayPal redirect: ตั้ง return_url/cancel_url แบบ server-side (ไม่จำเป็นถ้าใช้ JS SDK ในหน้า)
        },
      }),
    });

    const json = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: json?.message || 'create order failed', details: json });
    }

    // คืน orderID ให้ฝั่งหน้าเว็บใช้ไป approve/capture ต่อ
    res.status(200).json({ id: json.id, status: json.status, links: json.links });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'create order error' });
  }
}
