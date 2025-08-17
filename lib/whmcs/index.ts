// lib/whmcs/index.ts
import axios from 'axios';

// ใช้ env เดียวกับฟังก์ชันเดิม
const WHMCS_API_URL = process.env.WHMCS_API_URL!;
const WHMCS_IDENTIFIER = process.env.WHMCS_API_IDENTIFIER!;
const WHMCS_SECRET = process.env.WHMCS_API_SECRET!;

type BillingCycle = 'monthly' | 'quarterly' | 'semiannually' | 'annually';
type PaymentMethod = 'stripe' | 'paypal';

/** GET client by email (compat สำหรับ simulate.ts) */
export async function whmcsGetClientByEmail(email: string): Promise<{ result: string; userid?: number }> {
  const { data } = await axios.post(WHMCS_API_URL, null, {
    params: {
      action: 'GetClientsDetails',
      identifier: WHMCS_IDENTIFIER,
      secret: WHMCS_SECRET,
      email,
      stats: false,
      responsetype: 'json',
    },
  });
  // คืนรูปแบบที่ไฟล์ debug คาดหวัง
  return {
    result: data?.result ?? 'error',
    userid: data?.userid ? Number(data.userid) : undefined,
  };
}

/** ADD client (compat สำหรับ simulate.ts) */
export async function whmcsCreateClient(opts: {
  firstname: string;
  lastname: string;
  email: string;
  password2?: string;
  country?: string;
  currency?: number;
}): Promise<{ result: string; clientid?: number }> {
  const { data } = await axios.post(WHMCS_API_URL, null, {
    params: {
      action: 'AddClient',
      identifier: WHMCS_IDENTIFIER,
      secret: WHMCS_SECRET,
      firstname: opts.firstname,
      lastname: opts.lastname,
      email: opts.email,
      password2: opts.password2, // ถ้าไม่ใส่ WHMCS จะสุ่มให้
      country: opts.country ?? 'TH',
      currency: opts.currency ?? 1,
      responsetype: 'json',
    },
  });
  return {
    result: data?.result ?? 'error',
    clientid: data?.clientid ? Number(data.clientid) : undefined,
  };
}

/** ADD order (compat สำหรับ simulate.ts) */
export async function whmcsAddOrder(opts: {
  clientid: number;
  pid: number;
  paymentmethod: PaymentMethod;
  billingcycle?: BillingCycle;
  promocode?: string;
  notes?: string;
  noemail?: boolean;
}): Promise<{ result: string; invoiceid?: number; productids?: number[] }> {
  const { data } = await axios.post(WHMCS_API_URL, null, {
    params: {
      action: 'AddOrder',
      identifier: WHMCS_IDENTIFIER,
      secret: WHMCS_SECRET,
      clientid: opts.clientid,
      pid: opts.pid,
      paymentmethod: opts.paymentmethod,
      billingcycle: opts.billingcycle ?? 'monthly',
      noemail: typeof opts.noemail === 'boolean' ? opts.noemail : true,
      notes: opts.notes,
      promocode: opts.promocode,
      responsetype: 'json',
    },
  });

  let productids: number[] | undefined;
  if (Array.isArray(data?.productids)) productids = data.productids.map((x: any) => Number(x));
  else if (typeof data?.productids === 'string') productids = String(data.productids).split(',').map((x) => Number(x.trim()));
  else if (typeof data?.productids === 'number') productids = [Number(data.productids)];

  return {
    result: data?.result ?? 'error',
    invoiceid: data?.invoiceid ? Number(data.invoiceid) : undefined,
    productids,
  };
}

// re-export ฟังก์ชันรวมที่คุณมีอยู่แล้ว
export { createWHMCSClientAndInvoice } from './createWHMCSClientAndInvoice';
