// File: lib/whmcs.ts
type WhmcsResp = any;

async function callWHMCS(action: string, params: Record<string, any>): Promise<WhmcsResp> {
  const url = process.env.WHMCS_API_URL!;
  const identifier = process.env.WHMCS_API_IDENTIFIER!;
  const secret = process.env.WHMCS_API_SECRET!;
  if (!url || !identifier || !secret) throw new Error('Missing WHMCS credentials');
  const body = new URLSearchParams({ action, identifier, secret, responsetype: 'json', ...params });
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json,*/*' },
    body,
  });
  const type = resp.headers.get('content-type') || '';
  const data = type.includes('json') ? await resp.json() : JSON.parse(await resp.text());
  if (!resp.ok || data.result === 'error') throw new Error(JSON.stringify(data).slice(0, 300));
  return data;
}

export async function getInvoiceDetails(invoiceid: number | string) {
  const r = await callWHMCS('GetInvoice', { invoiceid });
  return r?.invoice;
}

export async function getClientDetails(userid: number | string) {
  const r = await callWHMCS('GetClientsDetails', { clientid: userid });
  return r?.client;
}

export async function getClientServices(userid: number | string) {
  const r = await callWHMCS('GetClientsProducts', { clientid: userid });
  return r?.products?.product ?? [];
}

/** เผื่อไฟล์อื่นเรียก */
export async function getCurrencies() {
  const r = await callWHMCS('GetCurrencies', {});
  return r?.currencies?.currency ?? [];
}
