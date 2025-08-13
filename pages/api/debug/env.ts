// pages/api/debug/env.ts
import type { NextApiRequest, NextApiResponse } from 'next'

function mask(v?: string) {
  if (!v) return '(not set)'
  if (v.length <= 6) return '*'.repeat(v.length)
  return v.slice(0,3) + '***' + v.slice(-3)
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // กันส่อง ENV ต้องมี admin key
  const adminKey = req.headers['x-admin-key'] || ''
  if (adminKey !== (process.env.ADMIN_API_KEY || '')) {
    return res.status(403).json({ ok:false, error:'Forbidden' })
  }

  res.status(200).json({
    ok: true,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      WHMCS_API_URL: process.env.WHMCS_API_URL || '(not set)',
      WHMCS_API_IDENTIFIER: mask(process.env.WHMCS_API_IDENTIFIER),
      WHMCS_API_SECRET: mask(process.env.WHMCS_API_SECRET),
      ADMIN_API_KEY: mask(process.env.ADMIN_API_KEY),
      // เติมที่คุณอยากตรวจเพิ่มได้
      SUPABASE_URL: process.env.SUPABASE_URL || '(not set)',
      SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
      STRIPE_SECRET_KEY: mask(process.env.STRIPE_SECRET_KEY),
      SENDGRID_API_KEY: mask(process.env.SENDGRID_API_KEY),
    },
  })
}
