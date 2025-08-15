// lib/logging/logEvent.ts
import { logger } from '../logger';
import { supabaseServer } from '@/lib/supabaseServer';

type LogRow = {
  ts: string;
  source: string;
  event: string;
  status?: string;
  message?: string;
  traceId?: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
  metadata?: unknown;
};

function nowISO() {
  try { return new Date().toISOString(); } catch { return '' + Date.now(); }
}

export async function logEvent(row: Omit<LogRow, 'ts'>) {
  const payload: LogRow = { ts: nowISO(), ...row };

  // 1) console (เสมอ)
  const level = payload.level ?? 'info';
  await (logger[level] ?? logger.info)({
    source: payload.source,
    event: payload.event,
    status: payload.status,
    traceId: payload.traceId,
    message: payload.message,
    metadata: payload.metadata
  });

  // 2) เข้าฐาน logs (best-effort)
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return; // ไม่มี env ก็ข้าม

    const supabase = supabaseServer();
    // สมมติคุณมีตาราง public.logs ที่คอลัมน์ตรงกับ LogRow (หรือปรับชื่อคอลัมน์ตามจริง)
    const { error } = await supabase.from('logs').insert([payload]);
    if (error) {
      // อย่าทำให้ endpoint พัง
      console.warn('[logEvent] insert logs failed', { error });
    }
  } catch (e) {
    console.warn('[logEvent] skipped (no supabase available)', { e });
  }
}
