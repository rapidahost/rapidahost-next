// lib/whmcs.ts — ตัวกลางเรียก WHMCS แบบบังคับ JSON + error ชัดเจน

export async function callWhmcs(params: Record<string, any>) {
  if (!process.env.WHMCS_API_URL) throw new Error('WHMCS_API_URL missing')

  const body = new URLSearchParams({
    identifier: process.env.WHMCS_API_IDENTIFIER || '',
    secret:     process.env.WHMCS_API_SECRET || '',
    responsetype: 'json',
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  })

  const resp = await fetch(process.env.WHMCS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const ct = resp.headers.get('content-type') || ''
  const text = await resp.text()

  if (!resp.ok) throw new Error(`WHMCS ${resp.status}: ${text.slice(0, 200)}`)
  if (!ct.includes('application/json')) {
    // มักเป็น HTML (เช่น Cloudflare Challenge / หน้า login / 404)
    throw new Error(`WHMCS non-JSON: ${text.slice(0, 200)}`)
  }

  try {
    const json = JSON.parse(text)
    // WHMCS มาตรฐานมีฟิลด์ result=success/ error
    if (json?.result && json.result !== 'success') {
      throw new Error(`WHMCS error: ${json.message || json.result}`)
    }
    return json
  } catch (e: any) {
    throw new Error(`WHMCS invalid JSON: ${e.message}`)
  }
}

/* ===== helper APIs ที่หน้า billing ใช้ ===== */

export async function getCurrencies() {
  return callWhmcs({ action: 'GetCurrencies' })
}

export async function getProductsByCurrency(currency_id: number) {
  return callWhmcs({ action: 'GetProducts', currencyid: currency_id })
}

export async function getProductPricing(pid: number, currency_id: number) {
  return callWhmcs({ action: 'GetProducts', pid, currencyid: currency_id })
}

/* ===== ที่เคยเพิ่มก่อนหน้า (ตัวอย่าง) ===== */

export async function getInvoiceDetails(invoiceid: number | string) {
  return callWhmcs({ action: 'GetInvoice', invoiceid: String(invoiceid) })
}

export async function getClientDetails(clientidOrEmail: { clientid?: number|string; email?: string }) {
  const p: any = { action: 'GetClientsDetails', stats: true }
  if (clientidOrEmail.clientid != null) p.clientid = String(clientidOrEmail.clientid)
  if (clientidOrEmail.email) p.email = clientidOrEmail.email
  return callWhmcs(p)
}

export async function getClientServices(clientid: number | string, opts?: { limitnum?: number; limitstart?: number; productid?: number|string }) {
  const p: any = { action: 'GetClientsProducts', clientid: String(clientid) }
  if (opts?.limitnum != null) p.limitnum = String(opts.limitnum)
  if (opts?.limitstart != null) p.limitstart = String(opts.limitstart)
  if (opts?.productid != null) p.pid = String(opts.productid)
  return callWhmcs(p)
}
