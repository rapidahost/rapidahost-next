// lib/retry/stripe.ts

import { getLogByTraceId, insertLog } from '@/lib/supabase/logs';
import { createWHMCSClientAndInvoice } from '@/lib/whmcs/createClientAndInvoice';
import { sendWelcomeEmail } from '@/lib/emails/sendWelcomeEmail';
import { stripe } from '@/lib/stripe/client';

interface RetryStripeParams {
  traceId: string;
  reason: string;
}

export async function retryStripeFlow({ traceId, reason }: RetryStripeParams) {
  const existingLog = await getLogByTraceId(traceId);

  if (!existingLog || !existingLog.metadata || existingLog.type !== 'stripe') {
    throw new Error('Invalid log or trace type');
  }

  const metadata = existingLog.metadata;
  const email = metadata.email;
  const name = metadata.name || '';
  const plan_id = metadata.plan_id;
  const payment_method = 'stripe';
  const promocode = metadata.promocode;
  const billingcycle = metadata.billingcycle;

  // Retry by re-creating WHMCS client & invoice
  const { clientId, invoiceId, password } = await createWHMCSClientAndInvoice({
    email,
    name,
    plan_id,
    payment_method,
    promocode,
    billingcycle,
  });

  await sendWelcomeEmail({
    clientId,
    email,
    password,
  });

  // Insert retry log
  await insertLog({
    traceId,
    type: 'stripe',
    source: 'retry-stripe',
    status: 'Retried',
    message: `Retry for Stripe completed: WHMCS client ${clientId}, invoice ${invoiceId}`,
    metadata: {
      clientId,
      invoiceId,
      email,
      plan_id,
      billingcycle,
      retryReason: reason,
    },
  });

  return { clientId, invoiceId };
}
