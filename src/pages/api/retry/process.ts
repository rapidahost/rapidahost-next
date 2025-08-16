// File: /pages/api/retry/process.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLogByTraceId, insertLog } from '@/lib/supabase/logs';
import { resendEmailByMessageId } from '@/lib/email/send';
import { createInvoice } from '@/lib/whmcs/invoice';

export async function POST(req: NextRequest) {
  try {
    const { traceId, reason } = await req.json();
    if (!traceId || !reason) {
      return NextResponse.json({ error: 'Missing traceId or reason' }, { status: 400 });
    }

    const originalLog = await getLogByTraceId(traceId);
    if (!originalLog) {
      return NextResponse.json({ error: 'Trace not found' }, { status: 404 });
    }

    let result = null;
    let retryType = '';

    switch (originalLog.type) {
      case 'email':
        result = await resendEmailByMessageId(originalLog.messageId);
        retryType = 'email.retry';
        break;

      case 'invoice':
        result = await createInvoice({
          clientId: originalLog.clientId,
          plan_id: originalLog.plan_id,
          amount: originalLog.amount,
          description: originalLog.description
        });
        retryType = 'invoice.retry';
        break;

      // More types can be added here

      default:
        return NextResponse.json({ error: 'Unsupported retry type' }, { status: 400 });
    }

    const newTraceId = await insertLog({
      type: retryType,
      status: 'Success',
      data: result,
      reason,
      parentTraceId: traceId,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ success: true, newTraceId });
  } catch (error) {
    console.error('Retry process error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

