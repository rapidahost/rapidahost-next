// lib/whmcs.ts
type WhmcsParams = Record<string, any>
type WhmcsResponse<T = any> = { result: 'success' | 'error'; message?: string; [k: string]: any } & T

const WHMCS_API_URL = process.env.WHMCS_API_URL!
const IDENTIFIER = process.env.WHMCS_API_IDENTIFIER!
const SECRET = process.env.WHMCS_API_SECRET!
const ACCESS_KEY = process.env.WHMCS_API_ACCESS_KEY || ''

async function callWhmcs<T = any>(params: WhmcsParams): Promise<WhmcsResponse<T>> {
  const body = new URLSearchParams({
    identifier: IDENTIFIER,
    secret: SECRET,
    ...(ACCESS_KEY ? { accesskey: ACCESS_KEY } : {}),
    responsetype: 'json',
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  })

  const res = await fetch(WHMCS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  return res.json()
}

/** ===== currencies ===== */
export async function whmcsListCurrencies() {
  return callWhmcs<{ currencies: { currency: Array<any> } }>({ action: 'GetCurrencies' })
}

/** ===== products & pricing ===== */
export async function whmcsListProducts(params?: { groupid?: number; module?: boolean }) {
  return callWhmcs({ action: 'GetProducts', ...(params?.groupid ? { gid: params.groupid } : {}), ...(params?.module ? { module: true } : {}) })
}
export async function whmcsGetProductPricing(pid: number, currencyid?: number) {
  return callWhmcs({ action: 'GetProductPricing', pid, currencyid: currencyid || 1 })
}
export async function whmcsValidatePromocode(promocode: string, pid?: number, billingcycle?: string) {
  const p: any = { action: 'ValidatePromocode', promocode }
  if (pid) p.pid = pid
  if (billingcycle) p.billingcycle = billingcycle
  return callWhmcs(p)
}
