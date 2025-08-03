import { NextRequest, NextResponse } from 'next/server';
import { getRetryQueue, clearRetryQueue } from '@/lib/retryQueue';
import axios from 'axios';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');

  if (cronSecret !== process.env.CRON_SECRET) {
    await logger.warn('ðŸ›¡ï¸ Unauthorized retry-email attempt', {
      ip: req.ip || req.headers.get('x-forwarded-for'),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const queue = await getRetryQueue();
  if (!queue.length) {
    await logger.info('ðŸ“­ Retry queue empty');
    return NextResponse.json({ message: 'No retries needed' }, { status: 200 });
  }

  const results = [];

  for (const item of queue) {
    try {
      const item = await popRetryItem();
if (!item) return NextResponse.json({ message: 'No retry' });

try {
  const res = await axios.post(`${process.env.LOCAL_API_BASE_URL}/api/send-email`, item);
  await logger.info('✅ Retry success', item);
  return NextResponse.json({ retried: item });
} catch (err: any) {
  await logger.error('❌ Retry failed again', { item, error: err.message });
  // Optional: add back to queue
  await addToRetryQueue(item);
  return NextResponse.json({ error: 'Retry failed', item });
}

