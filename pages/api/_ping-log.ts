import type { NextApiRequest, NextApiResponse } from 'next';
import { logEvent } from '@/lib/logging';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await logEvent({
    source: 'api',
    event: 'ping',
    status: 'ok',
    message: 'hello from dev',
    traceId: 'dev-test-' + Date.now(),
    metadata: { ua: req.headers['user-agent'] || '' },
  });
  res.json({ ok: true });
}

