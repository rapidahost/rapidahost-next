import type { NextApiRequest, NextApiResponse } from 'next'
import { callWhmcs } from '@/lib/whmcs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'Method not allowed' })
  const traceId = `HLTH_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
  try {
    const r = await callWhmcs({ action: 'GetCurrencies' })
    const count = r?.currencies?.currency?.length ?? 0
    return res.status(200).json({ ok:true, traceId, count })
  } catch (e:any) {
    console.error(`[${traceId}] WHMCS health failed:`, e?.message || e)
    return res.status(500).json({ ok:false, traceId, error: e?.message || String(e) })
  }
}

