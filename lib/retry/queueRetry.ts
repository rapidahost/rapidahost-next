// /lib/retry/queueRetry.ts
import { supabaseServer } from '@/lib/supabaseServer';

export type QueueRetryInput = {
  step: string;
  payload: any;
  delaySeconds?: number;
  traceId?: string; // ✅ เพิ่ม
};

export async function queueRetry(input: QueueRetryInput) {
  // ถ้ามีระบบ delay/next_run_at ค่อยเสริมภายหลังได้
  const row = {
    trace_id: input.traceId ?? null, // ✅ บันทึกลงคอลัมน์ trace_id
    step: input.step,
    payload: input.payload,
    attempts: 0,
    status: 'Pending',
    // created_at default now() ที่ DB จัดการ
  };

  const { error } = await supabaseServer.from('retries').insert(row);
  if (error) throw error;
}
