// pages/api/_ping-log.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { logEvent } from '@/lib/logging';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ua = (req.headers['user-agent'] as string) || 'unknown';
  const traceId =
    (req.headers['x-trace-id'] as string) ||
    (req.headers['x-vercel-id'] as string) ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  await logEvent('ping', {
    source: 'api',
    status: 'ok',
    message: '_ping-log',
    traceId,
    ua,
  });

  return res.status(200).json({ ok: true, traceId });
}
