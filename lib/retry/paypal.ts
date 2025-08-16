// lib/retry/paypal.ts
import { queueRetry } from '@/lib/retry/queueRetry'
import { logEvent } from '@/lib/logging/logEvent'

export type RetryPayPalInput = {
  orderId?: string | null
  captureId?: string | null
  reason?: string
  delaySeconds?: number
  traceId?: string | null
}

export async function retryPayPalFlow(input: RetryPayPalInput) {
  const payload = {
    orderId: input.orderId ?? null,
    captureId: input.captureId ?? null,
  }

  await logEvent({
    level: 'INFO',
    event: 'retry.paypal.requested',
    source: 'retry',
    payload: { ...payload, reason: input.reason ?? 'manual' },
    meta: { traceId: input.traceId ?? null },
  })

  const res = await queueRetry({
    type: 'paypal',
    reason: input.reason ?? 'manual',
    delaySeconds: input.delaySeconds ?? 0,
    payload,
    traceId: input.traceId ?? undefined,
  })

  await logEvent({
    level: 'INFO',
    event: 'retry.paypal.queued',
    source: 'retry',
    payload: { id: res.id ?? null, queued: res.queued, ...payload },
    meta: { traceId: input.traceId ?? null },
  })

  return res
}

