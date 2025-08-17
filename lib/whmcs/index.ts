// lib/whmcs/index.ts
import axios from 'axios';

const WHMCS_API_URL = process.env.WHMCS_API_URL!;
const WHMCS_IDENTIFIER = process.env.WHMCS_API_IDENTIFIER!;
const WHMCS_SECRET = process.env.WHMCS_API_SECRET!;

type BillingCycle = 'monthly' | 'quarterly' | 'semiannually' | 'annually';
type PaymentMethod = 'stripe' | 'paypal';

/** Generic caller สำหรับ WHMCS API (ใช้ใน /debug/whmcs/health.ts) */
export async function callWhmcs(action: string, params: Record<string, any> = {}) {
  const { data } = await axios.post(WHMCS_API_URL, null, {
    params: { action, identifier: WHMCS_IDENTIFIER, secret: WHMCS_SECRET, responsetype: 'json', ...params },
  });
  return data;
}

/** ใช้ email ค้นหา client; คืน shape ที่ไฟล์ simulate คาดหวัง */
export async function whmcsGetClientByEmail(email: string): Promise<{
  result: string;
  clients?: { client: Array<{ id: string }> };
}> {
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

  const result = data?.result ?? 'error';
  const clients =
    result === 'success' && data?.userid
      ? { client: [{ id: String(data.userid) }] }
      : { client: [] };

  return { result, clients };
}

/** สร้าง client ใหม่ (compat สำหรับ simulate.ts) */
export async function whmcsCreateClient(opts: {
  firstname: string;
  lastname: string;
  email: string;
  password2?: string;
  country?: string;
  currency?: number;
}): Promise<{ result: string; clientid?: number; message?: string }> {
  const { data } = await axios.post(WHMCS_API_URL, null, {
    params: {
      action: 'AddClient',
      identifier: WHMCS_IDENTIFIER,
      secret: WHMCS_SECRET,
      firstname: opts.firstname,
      lastname: opts.lastname,
      email: opts.email,
      password2: opts.password2,
      country: opts.country ?? 'TH',
      currency: opts.currency ?? 1,
      responsetype: 'json',
    },
  });

  return {
    result: data?.result ?? 'error',
    clientid: data?.clientid ? Number(data.clientid) : undefined,
    message: data?.message,
  };
}

/** สร้างคำสั่งซื้อ/ออกใบแจ้งหนี้ (compat สำหรับ simulate.ts) */
export async function whmcsAddOrder(opts: {
  clientid: number;
  pid: number;
  paymentmethod: PaymentMethod;
  billingcycle?: BillingCycle;
  promocode?: string;
  notes?: string;
  noemail?: boolean;
}): Promise<{ result: string; invoiceid?: number; productids?: number[]; message?: string }> {
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
  if (Array.isArray(data?.productids)) {
    productids = data.productids.map((x: any) => Number(x));
  } else if (typeof data?.productids === 'string') {
    productids = String(data.productids).split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n));
  } else if (typeof data?.productids === 'number') {
    productids = [Number(data.productids)];
  }

  return {
    result: data?.result ?? 'error',
    invoiceid: data?.invoiceid ? Number(data.invoiceid) : undefined,
    productids,
    message: data?.message,
  };
}

// ถ้ามีไฟล์นี้อยู่ ให้คง re-export นี้ไว้ด้วย
export { createWHMCSClientAndInvoice } from './createWHMCSClientAndInvoice';

// ----- เพิ่มด้านล่าง export/function เดิม ๆ -----

/** ดึงรายการสินค้า (ใช้ในหน้าคำนวณราคา / ออเดอร์) */
export async function whmcsListProducts(params?: {
  gid?: number;   // product group id
  module?: string;
  pid?: number;   // product id (จะได้ 1 รายการ)
}): Promise<{ result: string; products?: { product: any[] }; message?: string }> {
  const data = await callWhmcs('GetProducts', params ?? {});
  return {
    result: data?.result ?? 'error',
    products: data?.products,
    message: data?.message,
  };
}

/** ดึง pricing ของ product (คืนทั้ง block pricing ตรง ๆ เพื่อความเข้ากันได้กว้าง) */
export async function whmcsGetProductPricing(opts: {
  pid: number;
  currency?: number;            // currency id (เช่น 1 = USD แล้วแต่ระบบ)
  billingcycle?: BillingCycle;  // ถ้าต้องใช้ เลือก cycle ภายนอกจาก pricing ที่ส่งกลับ
}): Promise<{ result: string; pricing?: any; message?: string }> {
  const data = await callWhmcs('GetProducts', { pid: opts.pid, currency: opts.currency });
  const product = data?.products?.product?.[0];
  return {
    result: data?.result ?? 'error',
    pricing: product?.pricing,   // โยนทั้งก้อนให้ผู้เรียกตัดสินใจเลือก cycle/price เอง
    message: data?.message,
  };
}

/** ตรวจสอบโปรโมโค้ดกับสินค้า/รอบบิล */
export async function whmcsValidatePromocode(opts: {
  promocode: string;
  pid?: number;
  billingcycle?: BillingCycle;
  currency?: number;
}): Promise<{
  result: string;
  valid?: boolean;
  type?: string;
  amount?: number;
  description?: string;   // ✅ เพิ่ม field นี้
  data?: any;
  message?: string;
}> {
  const data = await callWhmcs('ValidatePromocode', {
    promocode: opts.promocode,
    pid: opts.pid,
    billingcycle: opts.billingcycle,
    currency: opts.currency,
  });

  // map ฟิลด์จากหลายเวอร์ชันของ WHMCS ให้เป็นมาตรฐานเดียว
  const type =
    data?.type ??
    data?.promotype ??
    data?.promotion?.type;

  const rawAmount =
    data?.amount ??
    data?.value ??
    data?.promotion?.value;

  const amount =
    typeof rawAmount === 'string' ? parseFloat(rawAmount)
    : typeof rawAmount === 'number' ? rawAmount
    : undefined;

  const description =
    data?.description ??
    data?.promodesc ??
    data?.promo_description ??
    data?.promotion?.description ??
    data?.promotion?.name ??
    undefined;

  return {
    result: data?.result ?? 'error',
    valid: data?.result === 'success',
    type,
    amount,
    description,   // ✅ คืนไปให้ผู้เรียกใช้
    data,
    message: data?.message,
  };
}
