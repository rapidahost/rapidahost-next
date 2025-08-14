// pages/api/currencies.ts
import type { NextApiRequest, NextApiResponse } from 'next';

// ⛳️ FIX: ห้ามใช้ "as const" ที่ config.runtime
export const config = { runtime: 'nodejs' };

type WhmcsCurrency = {
  id: number;
  code: string;
  prefix: string;
  suffix: string;
  rate: number;
  default?: boolean;
};

// …(โค้ดที่เหลือตามเวอร์ชันก่อนหน้าได้เลย ไม่ต้องเปลี่ยน)…

type Ok = {
  ok: true;
  traceId: string;
  source: 'whmcs' | 'stub';
  stub?: boolean;
  currencies: WhmcsCurrency[];
};

type Err = {
  ok: false;
  traceId: string;
  error: string;
  detail?: string;
  hint?: string;
};

const STUB: WhmcsCurrency[] = [
  { id: 1, code: 'USD', prefix: '$', suffix: '', rate: 1, default: true },
  { id: 2, code: 'THB', prefix: '', suffix: '฿', rate: 36 },
];

function traceId() {
  return `RPD-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(-5)
    .toUpperCase()}`;
}

function json<T>(res: NextApiResponse<T>, status: number, body: T) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return res.status(status).json(body);
}

function wantsStub(req: NextApiRequest) {
  const q = (req.query.stub ?? '').toString().toLowerCase();
  return q === '1' || q === 'true' || process.env.CURRENCIES_FALLBACK_STUB === '1';
}

function mapCurrencies(raw: any): WhmcsCurrency[] {
  const list = raw?.currencies?.currency ?? [];
  if (!Array.isArray(list)) return [];
  return list.map((c: any) => ({
    id: Number(c.id),
    code: String(c.code),
    prefix: String(c.prefix ?? ''),
    suffix: String(c.suffix ?? ''),
    rate: Number(c.rate ?? 1),
    default: String(c.default ?? '').toLowerCase() === 'on',
  }));
}

async function callWhmcs(action: string, params: Record<string, string>, signal: AbortSignal) {
  const url = process.env.WHMCS_API_URL || '';
  const identifier = process.env.WHMCS_API_IDENTIFIER || '';
  const secret = process.env.WHMCS_API_SECRET || '';
  if (!url || !identifier || !secret) {
    throw new Error('Missing WHMCS_API_URL / WHMCS_API_IDENTIFIER / WHMCS_API_SECRET');
  }
  const body = new URLSearchParams({
    action,
    identifier,
    secret,
    responsetype: 'json',
    ...params,
  });

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json,*/*',
    },
    body,
    // @ts-expect-error: keepalive is fine in node runtime
    keepalive: true,
    signal,
  });

  const text = await r.text();
  let data: any = undefined;
  try {
    data = JSON.parse(text);
  } catch {
    // keep data undefined
  }
  if (!r.ok) throw new Error(`WHMCS HTTP ${r.status}: ${text.slice(0, 160)}`);
  if (!data) throw new Error(`WHMCS returned non-JSON: ${text.slice(0, 160)}`);
  return data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  const id = traceId();
  res.setHeader('x-trace-id', id);

  // รองรับ HEAD/OPTIONS แบบเบา ๆ
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).setHeader('Allow', 'GET,OPTIONS').end();

  try {
    // โหมดสุขภาพ/สตับ
    if (req.query.health === '1' || wantsStub(req)) {
      return json(res, 200, { ok: true, traceId: id, source: 'stub', stub: true, currencies: STUB });
    }

    // เรียก WHMCS (มี time-out)
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort('timeout'), 12000);

    let currencies: WhmcsCurrency[] = [];
    try {
      const raw = await callWhmcs('GetCurrencies', {}, ac.signal);
      currencies = mapCurrencies(raw);
    } finally {
      clearTimeout(timer);
    }

    if (!currencies.length) {
      // กันตาย: ถ้า WHMCS ตอบว่าง และตั้งให้ใช้ stub ก็ส่ง stub
      if (process.env.CURRENCIES_FALLBACK_STUB === '1') {
        return json(res, 200, { ok: true, traceId: id, source: 'stub', stub: true, currencies: STUB });
      }
      return json(res, 500, {
        ok: false,
        traceId: id,
        error: 'Empty currencies from WHMCS',
        hint: 'Set CURRENCIES_FALLBACK_STUB=1 to force stub',
      });
    }

    return json(res, 200, { ok: true, traceId: id, source: 'whmcs', currencies });
  } catch (e: any) {
    console.error('[currencies]', id, e?.message || e);
    // กันตายขั้นสุด: ยังส่ง JSON stub ให้หน้า /billing ใช้งานต่อ
    return json(res, 200, {
      ok: true,
      traceId: id,
      source: 'stub',
      stub: true,
      currencies: STUB,
    });
  }
}
