import type { NextApiRequest, NextApiResponse } from 'next'
import { callWhmcs } from '@/lib/whmcs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error:'Method not allowed' })
  const traceId = `CURR_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
  try {
    const raw = await callWhmcs({ action: 'GetCurrencies' })
    const currencies = raw?.currencies?.currency?.map((c:any)=>({
      id: Number(c.id), code: String(c.code), prefix: c.prefix, suffix: c.suffix
    })) ?? []
    if (!currencies.length) {
      console.error(`[${traceId}] currencies empty`, raw)
      return res.status(502).json({ error:'No currencies from WHMCS', traceId })
    }
    return res.status(200).json({ traceId, currencies })
  } catch (e:any) {
    console.error(`[${traceId}] /api/currencies failed:`, e?.message || e)
    return res.status(500).json({
      error:'WHMCS currencies failed',
      traceId,
      hint:'Check WHMCS_API_URL / identifier / secret / Cloudflare'
    })
  }
}
