// pages/api/order/quote.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { whmcsGetProductPricing, whmcsValidatePromocode, whmcsListProducts } from '@/lib/whmcs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { pid, billing_cycle, currency_id, promocode } = req.body
    if (!pid || !billing_cycle) return res.status(400).json({ error: 'pid and billing_cycle are required' })

    // ชื่อแผน (หาจากรายการ products เพื่อให้ได้ name)
    const products = await whmcsListProducts()
    const product = (products.products?.product || []).find((p: any) => Number(p.pid) === Number(pid))
    const planName = product?.name || `Plan #${pid}`

    // ราคา base
    const pricing = await whmcsGetProductPricing(Number(pid), Number(currency_id) || 1)
    if (pricing.result !== 'success') return res.status(400).json({ error: pricing.message || 'GetProductPricing failed' })
    const cycleKey = String(billing_cycle).toLowerCase()
    const baseStr = pricing.pricing?.[cycleKey]
    if (!baseStr) return res.status(400).json({ error: `No price for cycle ${cycleKey}` })
    const baseAmount = parseFloat(baseStr)

    // คูปอง
    let coupon = { valid: false, type: '', amount: 0, description: '' as string }
    if (promocode) {
      const val = await whmcsValidatePromocode(String(promocode), Number(pid), cycleKey)
      if (val.result === 'success' && val.valid) {
        coupon.valid = true
        coupon.type = val.type || ''
        coupon.amount = val.amount ? parseFloat(val.amount) : 0
        coupon.description = val.description || String(promocode)
      } else {
        coupon.description = val.message || 'Invalid coupon'
      }
    }

    const subtotal = baseAmount
    let discount = 0
    if (coupon.valid) {
      if (coupon.type.toLowerCase().includes('percent')) discount = +(subtotal * (coupon.amount / 100)).toFixed(2)
      else discount = +coupon.amount
      if (discount > subtotal) discount = subtotal
    }
    const totalDue = +(subtotal - discount).toFixed(2)

    res.status(200).json({
      plan: { pid: Number(pid), name: planName, billingCycle: cycleKey, baseAmount },
      coupon,
      total: { subtotal, discount, totalDue }
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'quote error' })
  }
}
