import { NextRequest, NextResponse } from 'next/server';
import paypal from '@paypal/checkout-server-sdk';
import { createWHMCSClientAndInvoice } from '@/lib/whmcs/createClientInvoice';
import { sendEmailWithSendGrid } from '@/lib/email/sendEmailWithSendGrid';
import { logEvent } from '@/lib/logging/logEvent';

const clientId = process.env.PAYPAL_CLIENT_ID!;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
const isSandbox = process.env.PAYPAL_ENV !== 'live';

function environment() {
  return isSandbox
    ? new paypal.core.SandboxEnvironment(clientId, clientSecret)
    : new paypal.core.LiveEnvironment(clientId, clientSecret);
}

const client = new paypal.core.PayPalHttpClient(environment());

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orderId } = body;

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }

  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const capture = await client.execute(request);
    const unit = capture.result.purchase_units[0];
    const captureId = unit?.payments?.captures[0]?.id;
    const planId = unit.custom_id;
    const payerEmail = capture.result.payer.email_address;
    const payerName = `${capture.result.payer.name.given_name} ${capture.result.payer.name.surname}`;

    // 🔌 เชื่อมต่อ WHMCS API เพื่อสร้าง client + invoice + เปิดบริการ
    const { clientId, invoiceId, serviceId } = await createWHMCSClientAndInvoice({
      email: payerEmail,
      name: payerName,
      plan_id: planId,
      payment_method: 'paypal',
      paypal_capture_id: captureId,
    });

    // 📤 ส่ง Email ยืนยัน
    await sendEmailWithSendGrid({
      clientId,
      invoiceId,
      serviceId,
      to: payerEmail,
      type: 'paypal_confirmation',
    });

    // 📝 เก็บ Log
    await logEvent({
      traceId: orderId,
      type: 'paypal_payment',
      status: 'success',
      metadata: { clientId, invoiceId, serviceId },
    });

    return NextResponse.json({
      success: true,
      orderId,
      captureId,
      clientId,
      invoiceId,
      serviceId,
    });

  } catch (err: any) {
    console.error('PayPal WHMCS Error:', err);

    await logEvent({
      traceId: orderId,
      type: 'paypal_payment',
      status: 'failed',
      error: err.message,
    });

    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
