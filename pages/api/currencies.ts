// pages/api/currencies.ts — Hotfix v2 (always-JSON, traceId, stub fallback)
import type { NextApiRequest, NextApiResponse } from 'next'

type Currency = { id:number; code:string; prefix?:string; suffix?:string }

// safe mask
function mask(v?: string) {
  if (!v) return '(not set)'
  if (v.length <= 6) return '*'.repeat(v.length)
  return v.slice(0,3) + '***' + v.slice(-3)
}

// ใช้คืน stub ชุดเดียวกันทุกกรณี
function stubResponse(traceId: string) {
  const currencies: Currency[] = [
    { id: 1, code: 'USD', prefix: '$' },
    { id: 2, code: 'THB', prefix: '฿' },
    { id: 3, code: 'EUR', prefix: '€' },
  ]
  return { ok: true, traceId, stub: true, currencies }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const traceId = `CURR_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ ok:false, traceId, error:'Method not allowed' })
    }

    // 1) โหมดบังคับ STUB ด้วย query หรือ ENV (กัน production ล่ม)
    const forceStub = req.query.stub === '1'
      || req.query.fallback === '1'
      || process.env.CURRENCIES_FALLBACK_STUB === '1'

    if (forceStub) {
      console.log(`[${traceId}] currencies -> FORCE STUB mode`)
      return res.status(200).json(stubResponse(traceId))
    }

    // 2) ตรวจ ENV ที่จำเป็น
    const WHMCS_API_URL = process.env.WHMCS_API_URL
    const WHMCS_API_IDENTIFIER = process.env.WHMCS_API_IDENTIFIER
    const WHMCS_API_SECRET = process.env.WHMCS_API_SECRET

    if (!WHMCS_API_URL || !WHMCS_API_IDENTIFIER || !WHMCS_API_SECRET) {
      const msg = 'Missing WHMCS envs (WHMCS_API_URL / IDENTIFIER / SECRET)'
      console.error(`[${traceId}] ${msg}`, {
        WHMCS_API_URL: WHMCS_API_URL || '(missing)',
        WHMCS_API_IDENTIFIER: mask(WHMCS_API_IDENTIFIER),
        WHMCS_API_SECRET: mask(WHMCS_API_SECRET),
      })
      // ถ้าตั้ง ENV ให้ fallback → คืน stub แทน error
      if (process.env.CURRENCIES_FALLBACK_STUB === '1') {
        return res.status(200).json(stubResponse(traceId))
      }
      return res.status(500).json({ ok:false, traceId, error: msg })
    }

    // 3) ยิง WHMCS GetCurrencies
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
      body,
    })
    const ms = Date.now() - started
    const ct = resp.headers.get('content-type') || ''
    const text = await resp.text()

    console.log(`[${traceId}] WHMCS GetCurrencies -> ${resp.status} in ${ms}ms, ct=${ct}`)

    // Non-OK → รายงาน + อาจ fallback
    if (!resp.ok) {
      const payload = {
        ok:false, traceId, status: resp.status, contentType: ct,
        error:`WHMCS returned non-OK: ${resp.status}`,
        hint:'ตรวจ URL/credentials หรือโดน Cloudflare/Login challenge',
      }
      if (process.env.CURRENCIES_FALLBACK_STUB === '1') {
        console.error(`[${traceId}] non-OK -> fallback stub`, payload)
        return res.status(200).json(stubResponse(traceId))
      }
      return res.status(500).json(payload)
    }

    // Non-JSON → มักเป็นหน้า Login/CF
    if (!ct.includes('application/json')) {
      const payload = {
        ok:false, traceId, status: resp.status, contentType: ct,
        error:'WHMCS returned non-JSON (อาจเป็น HTML เช่น login/CF)',
        hint:'ใช้ endpoint API แท้ (เช่น /api/index.php) และยกเว้น challenge',
      }
      if (process.env.CURRENCIES_FALLBACK_STUB === '1') {
        console.error(`[${traceId}] non-JSON -> fallback stub`, payload)
        return res.status(200).json(stubResponse(traceId))
      }
      return res.status(500).json(payload)
    }

    let json:any
    try { json = JSON.parse(text) } catch {
      const payload = { ok:false, traceId, error:'Invalid JSON from WHMCS' }
      if (process.env.CURRENCIES_FALLBACK_STUB === '1') {
        console.error(`[${traceId}] invalid JSON -> fallback stub`)
        return res.status(200).json(stubResponse(traceId))
      }
      return res.status(500).json(payload)
    }

    if (json?.result && json.result !== 'success') {
      const payload = { ok:false, traceId, error:`WHMCS result != success: ${json?.message || json?.result}` }
      if (process.env.CURRENCIES_FALLBACK_STUB === '1') {
        console.error(`[${traceId}] result!=success -> fallback stub`, payload)
        return res.status(200).json(stubResponse(traceId))
      }
      return res.status(502).json(payload)
    }

    const list: Currency[] = json?.currencies?.currency?.map((c:any)=>({
      id: Number(c.id),
      code: String(c.code),
      prefix: c.prefix,
      suffix: c.suffix
    })) ?? []

    if (!list.length) {
      const payload = { ok:false, traceId, error:'No currencies from WHMCS' }
      if (process.env.CURRENCIES_FALLBACK_STUB === '1') {
        console.error(`[${traceId}] empty list -> fallback stub`)
        return res.status(200).json(stubResponse(traceId))
      }
      return res.status(502).json(payload)
    }

    return res.status(200).json({ ok:true, traceId, currencies: list })
  } catch (e:any) {
    console.error(`[${traceId}] /api/currencies crashed:`, e?.message || e)
    // crash ใด ๆ → ถ้าเปิด fallback ให้ stub กลับ
    if (process.env.CURRENCIES_FALLBACK_STUB === '1') {
      return res.status(200).json(stubResponse(traceId))
    }
    return res.status(500).json({ ok:false, traceId, error: e?.message || String(e) })
  }
}
