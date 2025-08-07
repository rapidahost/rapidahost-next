// lib/retry/paypal.ts
import { getLogByTraceId, insertLog } from '../supabase/logs';
import { sendEmail } from '../email/send';

export async function retryPayPalFlow(traceId: string) {
  const log = await getLogByTraceId(traceId);
  if (!log || log.type !== 'paypal') throw new Error('Invalid log or trace type');

  const { clientId, invoiceId, email } = log.data || {};

  // (Optional) Re-call WHMCS API if needed
  // await createClientOrInvoiceAgain(...);

  const result = await sendEmail({
    to: email,
    type: 'paypal-success',
    data: { clientId, invoiceId }
  });

  await insertLog({
    traceId,
    type: 'paypal-retry',
    status: 'success',
    data: result
  });
  return result;
}
