// File: lib/logs.ts
export type LogRow = { traceId: string; level?: string; event: string; meta?: any; createdAt?: string };

export async function getLogByTraceId(traceId: string): Promise<LogRow[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || '';
    if (!base) return [];
    const resp = await fetch(`${base}/api/logs?traceId=${encodeURIComponent(traceId)}`);
    if (!resp.ok) return [];
    const json = await resp.json().catch(() => null);
    return Array.isArray(json?.items) ? json.items : [];
  } catch {
    return [];
  }
}

export async function insertLog(row: LogRow): Promise<void> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || '';
    if (base) {
      await fetch(`${base}/api/logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
    } else {
      console.log('[insertLog]', row);
    }
  } catch (e) {
    console.warn('[insertLog] failed', e);
  }
}
