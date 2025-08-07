// /api/retry/process.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLogByTraceId, insertLog } from '@/lib/logs';
import { retryStripeFlow } from '@/lib/retry/stripe';
import { retryPayPalFlow } from '@/lib/retry/paypal';
import { retryEmailNotification } from '@/lib/retry/email';

export async function POST(req: NextRequest) {
  const { traceId } = await req.json();

  if (!traceId) {
    return NextResponse.json({ error: 'Missing traceId' }, { status: 400 });
  }

  const log = await getLogByTraceId(traceId);
  if (!log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 });
  }

  const { source, metadata } = log;
  let result;

  try {
    switch (source) {
      case 'stripe':
        result = await retryStripeFlow(log);
        break;
      case 'paypal':
        result = await retryPayPalFlow(log);
        break;
      case 'email':
        result = await retryEmailNotification(log);
        break;
      default:
        return NextResponse.json({ error: 'Unknown source' }, { status: 400 });
    }

    await insertLog({
      traceId,
      type: 'retry-success',
      source,
      metadata,
      status: 'success',
      message: `Retry for ${source} succeeded.`
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    await insertLog({
      traceId,
      type: 'retry-error',
      source,
      metadata,
      status: 'failed',
      message: error.message || 'Retry failed.'
    });

    return NextResponse.json({ error: error.message || 'Retry failed' }, { status: 500 });
  }
}
