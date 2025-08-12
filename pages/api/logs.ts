import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminKey = req.headers['x-admin-key']
  if (adminKey !== process.env.ADMIN_API_KEY) return res.status(401).json({ error: 'Unauthorized' })

  const { page = '1', pageSize = '50', q = '', status = '' } = req.query
  const p = Math.max(1, parseInt(String(page), 10))
  const ps = Math.min(200, Math.max(1, parseInt(String(pageSize), 10)))
  const from = (p - 1) * ps
  const to = from + ps - 1

  let query = supabase.from('logs').select('*').order('created_at', { ascending: false })

  if (q) {
    query = query.ilike('trace_id', `%${q}%`).or(`message.ilike.%${q}%`)
  }
  if (status) query = query.eq('status', status)

  const { data, error } = await query.range(from, to)
  if (error) return res.status(500).json({ error: error.message })

  res.status(200).json(data || [])
}
