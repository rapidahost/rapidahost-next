// /pages/api/logs/ingest.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { ENV } from '../../../lib/env';
import { supabaseServer } from '../../../lib/supabaseServer';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
type LogStatus = 'Success' | 'Failed' | 'Pending';

export type LogInput = {
  traceId?: string;
  source: string;          // e.g. "billing", "stripe-webhook", "whmcs", "email"
  event: string;           // short event name
  message?: string;
  level?: LogLevel;
  status?: LogStatus;
  data?: any;              // JSON payload
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== ENV.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = (typeof req.body === 'string') ? JSON.parse(req.body) : req.body;
  const payloads: LogInput[] = Array.isArray(body) ? body : [body];

  // sanitize + defaults
  const rows = payloads.map((p) => ({
    trace_id: p.traceId ?? null,
    source: p.source,
    event: p.event,
    message: p.message ?? null,
    level: p.level ?? 'INFO',
    status: p.status ?? 'Success',
    data: p.data ?? null
  }));

  const { error } = await supabaseServer.from('logs').insert(rows);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true, count: rows.length });
}

