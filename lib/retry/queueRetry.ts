// /lib/retry/queueRetry.ts
import { supabaseServer } from '@/lib/supabaseServer';

export type QueueRetryInput = {
  step: string;
  payload: any;
  delaySeconds?: number;
  traceId?: string;
  type?: string;    // ✅ เพิ่ม
  reason?: string;  // ✅ เพิ่ม
};

export type QueueRetryResult = { id: number | null };

export async function queueRetry(input: QueueRetryInput): Promise<QueueRetryResult> {
  // รวมเมทาดาต้าเข้า payload เพื่อไม่ต้องแก้สคีม่า DB
  const combinedPayload = {
    ...input.payload,
    ...(input.type ? { type: input.type } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    ...(typeof input.delaySeconds === 'number' ? { delaySeconds: input.delaySeconds } : {}),
  };

  const row = {
    trace_id: input.traceId ?? null,
    step: input.step,
    payload: combinedPayload,
    attempts: 0,
    status: 'Pending',
  };

  const { data, error } = await supabaseServer
    .from('retries')
    .insert(row)
    .select('id')
    .single();

  if (error) throw error;
  return { id: data?.id ?? null };
}
