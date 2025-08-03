import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import axios from 'axios';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const LOCAL_API_BASE = process.env.LOCAL_API_BASE_URL || 'https://rapidahost.com';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // ✅ กรองเฉพาะ event ที่ต้องการ
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    try {
      // ✅ 1. ดึงข้อมูลจาก metadata ที่แนบจาก frontend
      const email = session.customer_email!;
      const planId = metadata?.plan_id;
      const description = metadata?.description;

      if (!email || !planId) {
        console.error('❌ Missing metadata in Stripe session');
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // ✅ 2. สร้าง Client ผ่าน WHMCS API
      const clientRes = await callWhmcs('AddClient', {
        firstname: 'Stripe',
        lastname: 'Customer',
        email,
        password2: generateSecurePassword(),
        country: 'TH',
      });

      const clientId = clientRes.data.clientid;
      if (!clientId) throw new Error('Failed to create client');

      // ✅ 3. สร้าง Invoice + Order
      const orderRes = await callWhmcs('AddOrder', {
        clientid: clientId,
        pid: planId,
        paymentmethod: 'stripe',
        noemail: true,
      });

      const invoiceId = orderRes.data.invoiceid;
      const serviceId = orderRes.data.serviceid;

      if (!invoiceId || !serviceId) throw new Error('Failed to create order/invoice');

      console.log('✅ WHMCS created:', { clientId, invoiceId, serviceId });

      // ✅ 4. ส่ง Email ผ่าน /api/send-email
      const emailRes = await axios.post(`${LOCAL_API_BASE}/api/send-email`, {
        clientId,
        invoiceId,
        serviceId,
      });

      if (emailRes.status === 200) {
        console.log('📧 Email triggered successfully via /api/send-email');
      } else {
        console.warn('⚠️ Email trigger failed:', emailRes.data);
      }

      return NextResponse.json({ success: true }, { status: 200 });

    } catch (err: any) {
      console.error('❌ Webhook error:', err.message);
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// -------------------------------
// 🔧 ฟังก์ชันเรียก WHMCS API
async function callWhmcs(action: string, params: Record<string, any>) {
  return axios.post(process.env.WHMCS_API_URL!, {
    identifier: process.env.WHMCS_API_IDENTIFIER!,
    secret: process.env.WHMCS_API_SECRET!,
    action,
    responsetype: 'json',
    ...params,
  });
}

// -------------------------------
// 🔐 สร้าง Password ปลอดภัยชั่วคราว
function generateSecurePassword() {
  return Math.random().toString(36).slice(-10) + 'A1!';
}
