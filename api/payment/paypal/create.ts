// /api/payment/paypal/create.ts
import { NextRequest, NextResponse } from 'next/server';
import paypal from '@paypal/checkout-server-sdk';

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
  const { amount, currency, plan_id, description } = body;

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: currency || 'USD',
          value: amount.toString(),
        },
        custom_id: plan_id,
        description: description || 'Rapidahost Plan',
      },
    ],
    application_context: {
      brand_name: 'Rapidahost',
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/paypal-success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/paypal-cancel`,
    },
  });

  try {
    const order = await client.execute(request);
    return NextResponse.json({ id: order.result.id });
  } catch (error: any) {
    console.error('PayPal Order Error:', error);
    return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 });
  }
}
