// File: lib/logging.ts
export type LogMeta = Record<string, any>;
export type LogEventRow = { level?: 'info'|'warn'|'error'; event: string; meta?: LogMeta; traceId?: string };

export async function logEvent(event: string, meta?: LogMeta) {
  const row: LogEventRow = { level: 'info', event, meta };
  try {
    // ถ้ามี API เก็บ log ภายในโปรเจกต์:
    const base = process.env.NEXT_PUBLIC_BASE_URL || '';
    if (base) {
      await fetch(`${base}/api/logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
    } else {
      console.log('[logEvent]', row);
    }
  } catch (e) {
    console.warn('[logEvent] failed', e);
  }
}
