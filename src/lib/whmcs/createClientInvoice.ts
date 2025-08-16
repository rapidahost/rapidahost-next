// /lib/whmcs/createClientInvoice.ts
import axios from 'axios';

const WHMCS_API_URL = process.env.WHMCS_API_URL!;
const WHMCS_IDENTIFIER = process.env.WHMCS_API_IDENTIFIER!;
const WHMCS_SECRET = process.env.WHMCS_API_SECRET!;
const WHMCS_PRODUCT_MAPPING: Record<string, number> = {
  basic: 1,
  pro: 2,
  business: 3,
};

interface CreateWHMCSInput {
  email: string;
  name: string;
  plan_id: string;
  payment_method: 'stripe' | 'paypal';
  stripe_session_id?: string;
  paypal_capture_id?: string;
}

export async function createWHMCSClientAndInvoice(input: CreateWHMCSInput) {
  const { email, name, plan_id, payment_method, stripe_session_id, paypal_capture_id } = input;

  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ') || 'Customer';
  const productId = WHMCS_PRODUCT_MAPPING[plan_id];

  if (!productId) throw new Error(`Unknown plan_id: ${plan_id}`);

  // 1️⃣ สร้าง Client
  const clientRes = await axios.post(WHMCS_API_URL, null, {
    params: {
      action: 'AddClient',
      identifier: WHMCS_IDENTIFIER,
      secret: WHMCS_SECRET,
      firstname: firstName,
      lastname: lastName,
      email,
      password2: Math.random().toString(36).slice(-10),
      country: 'TH',
      currency: 1,
    },
  });

  const clientId = clientRes.data.result === 'success' ? clientRes.data.clientid : (() => {
    throw new Error('Failed to create WHMCS client');
  })();

  // 2️⃣ สร้าง Service
  const orderNote =
    payment_method === 'paypal'
      ? `PayPal Capture ID: ${paypal_capture_id}`
      : `Stripe Session: ${stripe_session_id}`;

  const orderRes = await axios.post(WHMCS_API_URL, null, {
    params: {
      action: 'AddOrder',
      identifier: WHMCS_IDENTIFIER,
      secret: WHMCS_SECRET,
      clientid: clientId,
      pid: productId,
      paymentmethod: payment_method,
      noemail: true,
      notes: orderNote,
    },
  });

  const invoiceId = orderRes.data.invoiceid;
  const serviceId = orderRes.data.productids?.[0];

  if (!invoiceId || !serviceId) throw new Error('Failed to create order or invoice');

  return { clientId, invoiceId, serviceId };
}

