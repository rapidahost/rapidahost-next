// pages/api/admin/checklist/seed.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@/lib/supabaseServer'

function requireAdmin(req: NextApiRequest) {
  const adminKey = process.env.ADMIN_API_KEY || ''
  const incoming = req.headers['x-admin-key'] as string | undefined
  if (!adminKey || incoming !== adminKey) {
    throw new Error('UNAUTHORIZED')
  }
}

const DEFAULT_ITEMS = [
  // section, code, title, sort
  ['Flow', 'FLOW', 'Auth → Billing → Payment → WHMCS → Email → Logs', 10],
  ['Payment', 'PAY_STRIPE', 'Stripe: sandbox & prod test pass', 20],
  ['Payment', 'PAY_PAYPAL', 'PayPal: sandbox & prod test pass', 30],
  ['Webhook', 'WEBHOOK_STRIPE', 'Stripe webhook: raw body + signature OK', 40],
  ['Webhook', 'WEBHOOK_PAYPAL', 'PayPal webhook: signature verify OK', 50],
  ['Email', 'EMAIL_TEMPLATE', 'SendGrid template (prod) OK', 60],
  ['Email', 'EMAIL_LOG', 'Email logs recorded in Supabase', 70],
  ['Env', 'ENV_SYNC', 'Vercel/GitHub/Local .env in sync', 80],
  ['Deploy', 'DEPLOY_TAG', 'Release tagged (vX.Y.Z)', 90],
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })
    requireAdmin(req)

    const sb = supabaseServer()

    const rows = DEFAULT_ITEMS.map(([section, code, title, sort]) => ({
      section,
      code,
      title,
      sort_order: Number(sort),
    }))

    const { error } = await sb.from('admin_checklist_items').upsert(rows, { onConflict: 'code' })
    if (error) throw error

    return res.status(200).json({ ok: true, count: rows.length })
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED') return res.status(401).json({ error: 'Unauthorized' })
    return res.status(500).json({ error: err?.message || 'Internal Error' })
  }
}
