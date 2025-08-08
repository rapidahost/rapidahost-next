// lib/retry/stripe.ts
import { queueRetry } from '@/lib/retry/queueRetry'
import { logEvent } from '@/lib/logging/logEvent'

export type RetryStripeInput = {
  chargeId?: string | null
  paymentIntentId?: string | null
  reason?: string
  delaySeconds?: number
  traceId?: string | null
}

export async function retryStripeFlow(input: RetryStripeInput) {
  const payload = {
    chargeId: input.chargeId ?? null,
    paymentIntentId: input.paymentIntentId ?? null,
  }

  await logEvent({
    level: 'info',
    event: 'retry.stripe.requested',
    source: 'retry',
    payload: { ...payload, reason: input.reason ?? 'manual' },
    meta: { traceId: input.traceId ?? null },
  })

  const res = await queueRetry({
    type: 'stripe',
    reason: input.reason ?? 'manual',
    delaySeconds: input.delaySeconds ?? 0,
    payload,
    traceId: input.traceId ?? undefined,
  })

  await logEvent({
    level: 'info',
    event: 'retry.stripe.queued',
    source: 'retry',
    payload: { id: res.id ?? null, queued: res.queued, ...payload },
    meta: { traceId: input.traceId ?? null },
  })

  return res
}
