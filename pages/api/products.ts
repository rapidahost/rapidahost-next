// pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { whmcsListProducts, whmcsGetProductPricing } from '@/lib/whmcs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const currency_id = parseInt((req.query.currency_id as string) || '1', 10)
    const groupid = req.query.groupid ? parseInt(String(req.query.groupid), 10) : undefined

    const list = await whmcsListProducts({ gid: groupid })
    if (list.result !== 'success') return res.status(400).json({ error: list.message || 'GetProducts failed' })

    const products = (list.products?.product || []) as Array<any>
    const enriched = await Promise.all(products.map(async (p) => {
      const pr = await whmcsGetProductPricing(Number(p.pid), currency_id)
      const pricing = pr?.pricing || {}
      return {
        pid: Number(p.pid),
        name: p.name,
        description: p.description || '',
        pricing: {
          monthly: pricing.monthly ? parseFloat(pricing.monthly) : null,
          quarterly: pricing.quarterly ? parseFloat(pricing.quarterly) : null,
          semiannually: pricing.semiannually ? parseFloat(pricing.semiannually) : null,
          annually: pricing.annually ? parseFloat(pricing.annually) : null,
          biennially: pricing.biennially ? parseFloat(pricing.biennially) : null,
          triennially: pricing.triennially ? parseFloat(pricing.triennially) : null,
        }
      }
    }))
    res.status(200).json({ products: enriched })
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'products error' })
  }
}

