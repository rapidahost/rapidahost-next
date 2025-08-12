// pages/api/admin/checklist/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@/lib/supabaseServer'

function requireAdmin(req: NextApiRequest) {
  const adminKey = process.env.ADMIN_API_KEY || ''
  const incoming = req.headers['x-admin-key'] as string | undefined
  if (!adminKey || incoming !== adminKey) {
    throw new Error('UNAUTHORIZED')
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      requireAdmin(req)
      const runKey = String(req.query.runKey || '')

      const sb = supabaseServer()

      // หา run ล่าสุด ถ้าไม่ระบุ runKey
      let runId: string | null = null
      if (runKey) {
        const { data: runByKey } = await sb
          .from('admin_checklist_runs')
          .select('id, run_key')
          .eq('run_key', runKey)
          .maybeSingle()
        runId = runByKey?.id ?? null
      } else {
        const { data: latest } = await sb
          .from('admin_checklist_runs')
          .select('id, run_key, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
        runId = latest?.[0]?.id ?? null
      }

      // ดึง items + map สถานะ run ปัจจุบัน (ถ้าไม่มี run ก็ยังส่งรายการได้)
      const { data: items, error: e1 } = await sb
        .from('admin_checklist_items')
        .select('*')
        .order('section', { ascending: true })
        .order('sort_order', { ascending: true })
      if (e1) throw e1

      let statusMap: Record<string, any> = {}
      if (runId) {
        const { data: st } = await sb
          .from('admin_checklist_status')
          .select('item_code, checked, assignee, note, updated_at')
          .eq('run_id', runId)
        statusMap = Object.fromEntries((st || []).map((r) => [r.item_code, r]))
      }

      return res.status(200).json({ runId, items, statusMap })
    }

    if (req.method === 'POST') {
      requireAdmin(req)
      const { runId, itemCode, checked, assignee, note } = req.body || {}
      if (!runId || !itemCode) return res.status(400).json({ error: 'runId & itemCode required' })

      const sb = supabaseServer()
      const { data, error } = await sb
        .from('admin_checklist_status')
        .upsert(
          { run_id: runId, item_code: itemCode, checked: !!checked, assignee: assignee || null, note: note || null, updated_at: new Date().toISOString() },
          { onConflict: 'run_id,item_code' }
        )
        .select()
        .single()

      if (error) throw error
      return res.status(200).json({ ok: true, data })
    }

    return res.status(405).json({ error: 'Method Not Allowed' })
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED') return res.status(401).json({ error: 'Unauthorized' })
    return res.status(500).json({ error: err?.message || 'Internal Error' })
  }
}
