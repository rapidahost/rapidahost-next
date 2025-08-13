// pages/api/currencies.ts
import type { NextApiRequest, NextApiResponse } from 'next'

type Currency = { id:number; code:string; prefix?:string; suffix?:string }

function mask(s?: string) {
  if (!s) return ''
  if (s.length <= 6) return '*'.repeat(s.length)
  return s.slice(0,3) + '***' + s.slice(-3)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'Method not allowed' })

  const traceId = `CURR_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
  const isAdmin = (req.headers['x-admin-key'] || '') === (process.env.ADMIN_API_KEY || '')

  // โหมด STUB เพื่อให้ /billing ไปต่อได้แม้ WHMCS ล่ม
  if (req.query.stub === '1') {
    return res.status(200).json({
      ok: true,
      traceId,
      stub: true,
      currencies: [
        { id: 1, code: 'USD', prefix: '$' },
        { id: 2, code: 'THB', prefix: '฿' },
      ] as Currency[],
    })
  }

  const WHMCS_API_URL = process.env.WHMCS_API_URL
  const WHMCS_API_IDENTIFIER = process.env.WHMCS_API_IDENTIFIER
  const WHMCS_API_SECRET = process.env.WHMCS_API_SECRET

  if (!WHMCS_API_URL || !WHMCS_API_IDENTIFIER || !WHMCS_API_SECRET) {
    console.error(`[${traceId}] Missing WHMCS envs`, {
      WHMCS_API_URL: WHMCS_API_URL || '(missing)',
      WHMCS_API_IDENTIFIER: mask(WHMCS_API_IDENTIFIER),
      WHMCS_API_SECRET: mask(WHMCS_API_SECRET),
    })
    return res.status(500).json({
      ok:false, traceId,
      error:'Missing WHMCS envs (WHMCS_API_URL / IDENTIFIER / SECRET)',
      hint:'ตั้งค่าใน Vercel → Project → Settings → Environment Variables แล้ว redeploy',
    })
  }

  try {
    const started = Date.now()
    const body = new URLSearchParams({
      identifier: WHMCS_API_IDENTIFIER,
      secret: WHMCS_API_SECRET,
      action: 'GetCurrencies',
      responsetype: 'json',
    })
    const resp = await fetch(WHMCS_API_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body
    })
    const ms = Date.now() - started
    const ct = resp.headers.get('content-type') || ''
    const text = await resp.text()

    console.log(`[${traceId}] WHMCS GetCurrencies -> ${resp.status} in ${ms}ms, ct=${ct}`)

    if (!resp.ok) {
      return res.status(500).json({
        ok:false, traceId, status: resp.status, contentType: ct,
        error:`WHMCS returned non-OK: ${resp.status}`,
        snippet: isAdmin ? text.slice(0,400) : undefined,
        hint:'ตรวจ WHMCS_API_URL/credentials หรือโดน Cloudflare challenge',
      })
    }

    if (!ct.includes('application/json')) {
      return res.status(500).json({
        ok:false, traceId, status: resp.status, contentType: ct,
        error:'WHMCS returned non-JSON (อาจเป็น HTML เช่นหน้า login/CF)',
        snippet: isAdmin ? text.slice(0,400) : undefined,
        hint:'ใช้ endpoint API แท้ (เช่น /api/index.php) และยกเว้น challenge',
      })
    }

    let json: any
    try { json = JSON.parse(text) } catch {
      return res.status(500).json({ ok:false, traceId, error:'Invalid JSON from WHMCS' })
    }

    if (json?.result && json.result !== 'success') {
      return res.status(502).json({
        ok:false, traceId, error:`WHMCS result != success: ${json?.message || json?.result}`
      })
    }

    const list: Currency[] = json?.currencies?.currency?.map((c:any)=>({
      id: Number(c.id), code: String(c.code), prefix: c.prefix, suffix: c.suffix
    })) ?? []

    if (!list.length) {
      console.error(`[${traceId}] currencies empty`, json)
      return res.status(502).json({ ok:false, traceId, error:'No currencies from WHMCS' })
    }

    return res.status(200).json({ ok:true, traceId, currencies: list })
  } catch (e:any) {
    console.error(`[${traceId}] /api/currencies error:`, e?.message || e)
    return res.status(500).json({
      ok:false, traceId, error: e?.message || String(e),
      hint:'เปิด Vercel Logs แล้วค้น traceId นี้',
    })
  }
}
