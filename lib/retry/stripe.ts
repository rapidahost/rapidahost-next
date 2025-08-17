// lib/retry/stripe.ts
import { queueRetry } from '@/lib/retry/queueRetry'
import { logEvent } from '@/lib/logging'

export type RetryStripeInput = {
  reason?: string
  delaySeconds?: number
  traceId?: string
  [key: string]: any
}

export async function requestRetryStripe(input: RetryStripeInput) {
  const { reason, delaySeconds, traceId, ...payload } = (input || {}) as Record<string, any>

  // log: requested (ย้าย payload ไป meta)
  await logEvent('retry.stripe.requested', {
    source: 'retry',
    reason: reason ?? 'manual',
    traceId,
    ...payload,
    level: 'INFO',
  })

  // คิวงาน retry
  const res = await queueRetry({
    type: 'stripe',
    reason: reason ?? 'manual',
    delaySeconds: delaySeconds ?? 0,
    payload,
    traceId,
  } as any)

  // log: queued (ย้าย payload ไป meta)
  await logEvent('retry.stripe.queued', {
    source: 'retry',
    id: (res as any)?.id ?? null,
    queued: !!(res as any)?.queued,
    ...payload,
    level: 'INFO',
  })

  return res
}
