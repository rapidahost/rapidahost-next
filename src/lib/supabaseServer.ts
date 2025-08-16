// src/lib/supabaseServer.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // ใช้เฉพาะฝั่ง Server

if (!url || !roleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// สร้าง client ครั้งเดียว แล้ว export เป็น "ตัวแปร" (ไม่ใช่ฟังก์ชัน)
export const supabaseServer: SupabaseClient = createClient(url, roleKey, {
  auth: { persistSession: false },
});

