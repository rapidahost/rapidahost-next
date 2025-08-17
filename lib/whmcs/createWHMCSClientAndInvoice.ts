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

  // แปลงชื่อ–สกุล
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ') || 'Customer';

  // map แผนเป็น product id
  const productId = WHMCS_PRODUCT_MAPPING[plan_id];
  if (!productId) throw new Error(`Unknown plan_id: ${plan_id}`);

  // >>> สำคัญ: ประกาศตัวแปรที่ WHMCS ต้องการชื่อคีย์ว่า "paymentmethod"
  const paymentmethod = (payment_method ?? 'stripe').toLowerCase() as 'stripe' | 'paypal';

  let clientId: number;
  let newPassword: string | undefined;

  // 1) หา client จากอีเมล
  const existingClientRes = await axios.post(WHMCS_API_URL, null, {
    params: {
      action: 'GetClientsDetails',
      identifier: WHMCS_IDENTIFIER,
      secret: WHMCS_SECRET,
      email,
      stats: false,
      responsetype: 'json',
    },
  });

  if (existingClientRes.data?.result === 'success' && existingClientRes.data?.userid) {
    clientId = Number(existingClientRes.data.userid);
  } else {
    // 2) ไม่เจอ → สร้าง client ใหม่
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
        responsetype: 'json',
      },
    });

    if (clientRes.data?.result !== 'success' || !clientRes.data?.clientid) {
      throw new Error('Failed to create WHMCS client');
    }
    clientId = Number(clientRes.data.clientid);
  }

  // 3) สร้าง Order (ผูก Service + ออก Invoice)
  const orderNote =
    paymentmethod === 'paypal'
      ? `PayPal Capture ID: ${paypal_capture_id ?? 'n/a'}`
      : `Stripe Session: ${stripe_session_id ?? 'n/a'}`;

  const orderParams: any = {
    action: 'AddOrder',
    identifier: WHMCS_IDENTIFIER,
    secret: WHMCS_SECRET,
    clientid: clientId,
    pid: productId,           // สำหรับสินค้าชิ้นเดียว ใส่เป็นค่าตรง ๆ ได้
    paymentmethod,            // 👈 ตอนนี้มีตัวแปรแล้ว
    billingcycle,             // 'monthly' | 'quarterly' | 'semiannually' | 'annually'
    noemail: true,
    notes: orderNote,
    responsetype: 'json',
  };

  if (promocode) {
    orderParams.promocode = promocode;
  }

  const orderRes = await axios.post(WHMCS_API_URL, null, { params: orderParams });

  if (orderRes.data?.result !== 'success') {
    throw new Error('Failed to create order: ' + (orderRes.data?.message ?? 'unknown error'));
  }

  const invoiceId = Number(orderRes.data.invoiceid);

  // productids บางเวอร์ชันคืนมาเป็นสตริงคอมมา/ตัวเลขเดี่ยว
  let serviceId: number | undefined;
  if (Array.isArray(orderRes.data.productids)) {
    serviceId = Number(orderRes.data.productids[0]);
  } else if (typeof orderRes.data.productids === 'string') {
    serviceId = Number(String(orderRes.data.productids).split(',')[0]);
  } else if (typeof orderRes.data.productids === 'number') {
    serviceId = Number(orderRes.data.productids);
  }

  if (!invoiceId || !serviceId) {
    throw new Error('Invoice or Service not created');
  }

  return { clientId, invoiceId, serviceId, password: newPassword };
}
