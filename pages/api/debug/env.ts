// pages/api/debug/env.ts
import type { NextApiRequest, NextApiResponse } from 'next'

function mask(v?: string) {
  if (!v) return '(missing)'
  if (v.length <= 6) return '*'.repeat(v.length)
  return v.slice(0,3) + '***' + v.slice(-3)
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    WHMCS_API_URL: process.env.WHMCS_API_URL ? '(set)' : '(missing)',
    WHMCS_API_IDENTIFIER: mask(process.env.WHMCS_API_IDENTIFIER),
    WHMCS_API_SECRET: mask(process.env.WHMCS_API_SECRET),
    ADMIN_API_KEY: mask(process.env.ADMIN_API_KEY),
  }
  res.status(200).json({ ok: true, env })
}
