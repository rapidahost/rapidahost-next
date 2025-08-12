// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ป้องกันการสร้าง client ซ้ำตอน Hot Reload
export const supabaseAdmin =
  (global as any).supabaseAdmin ??
  createClient(url, serviceKey, {
    auth: { persistSession: false },
  })

if (process.env.NODE_ENV !== 'production') {
  ;(global as any).supabaseAdmin = supabaseAdmin
}
