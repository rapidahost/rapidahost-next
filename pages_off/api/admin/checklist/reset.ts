// pages/api/admin/checklist/reset.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@/lib/supabaseServer'

function requireAdmin(req: NextApiRequest) {
  const adminKey = process.env.ADMIN_API_KEY || ''
  const incoming = req.headers['x-admin-key'] as string | undefined
  if (!adminKey || incoming !== adminKey) {
    throw new Error('UNAUTHORIZED')
  }
}

// สร้าง run ใหม่ และเติม status แถวเปล่า
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })
    requireAdmin(req)

    const { runKey, createdBy } = req.body || {}
    const sb = supabaseServer()

    // create run
    const key = runKey || new Date().toISOString().replace(/[:.]/g, '-')
    const { data: run, error: e1 } = await sb
      .from('admin_checklist_runs')
      .insert({ run_key: key, created_by: createdBy || null })
      .select('id, run_key')
      .single()
    if (e1) throw e1

    // optional: สร้างแถวสถานะว่าง (ไม่จำเป็นต้องสร้างล่วงหน้าก็ได้)
    // เราจะดึงทีหลังตอนติ๊กครั้งแรกด้วย upsert ใน /api/admin/checklist

    return res.status(200).json({ ok: true, run })
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED') return res.status(401).json({ error: 'Unauthorized' })
    return res.status(500).json({ error: err?.message || 'Internal Error' })
  }
}
