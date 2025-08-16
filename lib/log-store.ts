// /lib/log-store.ts
import { supabaseServer } from './supabaseServer';

export type LogRow = {
  id: string;
  created_at: string;
  level?: string;
  event: string;
  source: string;
  status?: string;
  message?: string | null;
  trace_id?: string | null;
  payload?: Record<string, any>;
};

export async function insertLog(row: Omit<LogRow, 'id' | 'created_at'>): Promise<LogRow | null> {
  try {
    const sb = supabaseServer;
    const { data, error } = await sb
      .from('logs')
      .insert({
        level: row.level ?? 'info',
        event: row.event,
        source: row.source,
        status: row.status ?? 'info',
        message: row.message ?? null,
        trace_id: row.trace_id ?? null,
        payload: row.payload ?? {},
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as LogRow;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[insertLog] fail:', e);
    return null;
  }
}

export async function getLogByTraceId(traceId: string): Promise<LogRow | null> {
  try {
    const sb = supabaseServer;
    const { data, error } = await sb
      .from('logs')
      .select('*')
      .eq('trace_id', traceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as LogRow) ?? null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[getLogByTraceId] fail:', e);
    return null;
  }
}

export async function listLogs(params?: {
  source?: string;
  event?: string;
  level?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const sb = supabaseServer;
  let q = sb.from('logs').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (params?.source) q = q.eq('source', params.source);
  if (params?.event) q = q.eq('event', params.event);
  if (params?.level) q = q.eq('level', params.level);
  if (params?.status) q = q.eq('status', params.status);
  if (params?.offset) q = q.range(params.offset, (params.offset ?? 0) + (params.limit ?? 50) - 1);
  else if (params?.limit) q = q.limit(params.limit);
  const { data, error, count } = await q;
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[listLogs] fail:', error);
    return { data: [], count: 0 };
  }
  return { data: (data as LogRow[]) ?? [], count: count ?? 0 };
}
