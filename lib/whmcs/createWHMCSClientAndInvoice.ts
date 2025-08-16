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
  billingcycle?: 'monthly' | 'quarterly' | 'semiannually' | 'annually';
  promocode?: string;
}

export async function createWHMCSClientAndInvoice(input: CreateWHMCSInput) {
  const {
    email,
    name,
    plan_id,
    payment_method,
    stripe_session_id,
    paypal_capture_id,
    billingcycle = 'monthly',
    promocode,
  } = input;

  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ') || 'Customer';
  const productId = WHMCS_PRODUCT_MAPPING[plan_id];
  if (!productId) throw new Error(`Unknown plan_id: ${plan_id}`);

  let clientId: number;
  let newPassword: string | undefined;

  // 1️⃣ ตรวจสอบว่า client มีอยู่แล้วหรือไม่
  const existingClientRes = await axios.post(WHMCS_API_URL, null, {
    params: {
      action: 'GetClientsDetails',
      identifier: WHMCS_IDENTIFIER,
      secret: WHMCS_SECRET,
      email,
      stats: false,
    },
  });

  if (existingClientRes.data.result === 'success') {
    clientId = existingClientRes.data.userid;
  } else {
    // 2️⃣ ถ้าไม่มี → สร้าง Client ใหม่ และเก็บ password ไว้สำหรับคืนค่า
    newPassword = Math.random().toString(36).slice(-10);

    const clientRes = await axios.post(WHMCS_API_URL, null, {
      params: {
        action: 'AddClient',
        identifier: WHMCS_IDENTIFIER,
        secret: WHMCS_SECRET,
        firstname: firstName,
        lastname: lastName,
        email,
        password2: newPassword,
        country: 'TH',
        currency: 1,
      },
    });

    if (clientRes.data.result !== 'success') {
      throw new Error('Failed to create WHMCS client');
    }

    clientId = clientRes.data.clientid;
  }

  // 3️⃣ สร้าง Order (Service + Invoice)
  const orderNote =
    payment_method === 'paypal'
      ? `PayPal Capture ID: ${paypal_capture_id}`
      : `Stripe Session: ${stripe_session_id}`;

  const orderParams: any = {
    action: 'AddOrder',
    identifier: WHMCS_IDENTIFIER,
    secret: WHMCS_SECRET,
    clientid: clientId,
    pid: productId,
    paymentmethod,
    billingcycle,
    noemail: true,
    notes: orderNote,
  };

  if (promocode) {
    orderParams.promocode = promocode;
  }

  const orderRes = await axios.post(WHMCS_API_URL, null, { params: orderParams });

  if (orderRes.data.result !== 'success') {
    throw new Error('Failed to create order: ' + orderRes.data.message);
  }

  const invoiceId = orderRes.data.invoiceid;
  const serviceId = orderRes.data.productids?.[0];

  if (!invoiceId || !serviceId) throw new Error('Invoice or Service not created');

  return { clientId, invoiceId, serviceId, password: newPassword };
}

