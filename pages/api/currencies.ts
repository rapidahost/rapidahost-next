// pages/api/currencies.ts (DEBUG version)
import type { NextApiRequest, NextApiResponse } from 'next'

type DebugSummary = {
  ok: boolean
  traceId: string
  status?: number
  contentType?: string
  count?: number
  error?: string
  hint?: string
}

function mask(s?: string) {
  if (!s) return ''
  if (s.length <= 6) return '*'.repeat(s.length)
  return s.slice(0, 3) + '***' + s.slice(-3)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<DebugSummary | any>) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, traceId: '', error: 'Method not allowed' })

  const traceId = `CURR_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const isAdmin = (req.headers['x-admin-key'] || '') === (process.env.ADMIN_API_KEY || '')

  const WHMCS_API_URL = process.env.WHMCS_API_URL
  const WHMCS_API_IDENTIFIER = process.env.WHMCS_API_IDENTIFIER
  const WHMCS_API_SECRET = process.env.WHMCS_API_SECRET

  if (!WHMCS_API_URL || !WHMCS_API_IDENTIFIER || !WHMCS_API_SECRET) {
    const msg = 'Missing WHMCS envs (WHMCS_API_URL / WHMCS_API_IDENTIFIER / WHMCS_API_SECRET)'
    console.error(`[${traceId}]`, msg, {
      WHMCS_API_URL: WHMCS_API_URL || '(missing)',
      WHMCS_API_IDENTIFIER: mask(WHMCS_API_IDENTIFIER),
      WHMCS_API_SECRET: mask(WHMCS_API_SECRET),
    })
    return res.status(500).json({
      ok: false,
      traceId,
      error: msg,
      hint: 'ตั้งค่า ENV ให้ครบใน Vercel → Project → Settings → Environment Variables',
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
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    const ms = Date.now() - started
    const contentType = resp.headers.get('content-type') || ''
    const text = await resp.text()

    // log ฝั่งเซิร์ฟเวอร์ (ดูได้ใน Vercel Logs)
    console.log(`[${traceId}] WHMCS GetCurrencies -> ${resp.status} in ${ms}ms, ct=${contentType}`)

    if (!resp.ok) {
      // ส่ง JSON เสมอ
      const payload: DebugSummary & { snippet?: string } = {
        ok: false,
        traceId,
        status: resp.status,
        contentType,
        error: `WHMCS returned non-OK: ${resp.status}`,
        hint: 'ตรวจสอบ WHMCS_API_URL/credentials หรือ Cloudflare challenge',
      }
      if (isAdmin) payload.snippet = text.slice(0, 400)
      return res.status(500).json(payload)
    }

    if (!contentType.includes('application/json')) {
      const payload: DebugSummary & { snippet?: string } = {
        ok: false,
        traceId,
        status: resp.status,
        contentType,
        error: 'WHMCS returned non-JSON (อาจเป็น HTML เช่น หน้า login/CF challenge)',
        hint: 'ยืนยันว่า WHMCS_API_URL คือ endpoint API จริง และไม่มี challenge',
      }
      if (isAdmin) payload.snippet = text.slice(0, 400)
      return res.status(500).json(payload)
    }

    // parse JSON
    let json: any
    try {
      json = JSON.parse(text)
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        traceId,
        status: resp.status,
        contentType,
        error: 'Invalid JSON from WHMCS',
      })
    }

    if (json?.result && json.result !== 'success') {
      const msg = `WHMCS result != success: ${json?.message || json?.result}`
      console.error(`[${traceId}]`, msg)
      return res.status(502).json({
        ok: false,
        traceId,
        status: resp.status,
        contentType,
        error: msg,
      })
    }

    // map เป็นรูปแบบที่หน้า /billing ใช้
    const currencies = json?.currencies?.currency ?? []
    const result = {
      ok: true,
      traceId,
      count: currencies.length,
      currencies: currencies.map((c: any) => ({
        id: Number(c.id),
        code: String(c.code),
        prefix: c.prefix,
        suffix: c.suffix,
      })),
    }

    return res.status(200).json(result)
  } catch (e: any) {
    console.error(`[${traceId}] /api/currencies error:`, e?.message || e)
    return res.status(500).json({
      ok: false,
      traceId,
      error: e?.message || String(e),
      hint: 'ดู Vercel Logs โดยค้น traceId นี้',
    })
  }
}
