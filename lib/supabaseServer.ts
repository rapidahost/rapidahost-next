import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // ใช้เฉพาะฝั่ง Server

if (!url || !roleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// สร้าง client ครั้งเดียวใช้ทั้งแอป
export const supabaseServer: SupabaseClient = createClient(url, roleKey, {
  auth: { persistSession: false },
});

