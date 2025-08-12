// pages/api/currencies.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { whmcsListCurrencies } from '@/lib/whmcs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const r = await whmcsListCurrencies()
    if (r.result !== 'success') return res.status(400).json({ error: r.message || 'GetCurrencies failed' })
    const currencies = (r.currencies?.currency || []).map((c: any) => ({
      id: Number(c.id), code: String(c.code), prefix: c.prefix ?? '', suffix: c.suffix ?? '', rate: c.rate != null ? Number(c.rate) : 1,
    }))
    currencies.sort((a, b) => (a.code === 'USD' ? -1 : b.code === 'USD' ? 1 : a.code.localeCompare(b.code)))
    res.status(200).json({ currencies })
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'currencies error' })
  }
}
