// lib/retry/email.ts
import { queueRetry } from '@/lib/retry/queueRetry'
import { logEvent } from '@/lib/logging/logEvent'

export type RetryEmailInput = {
  messageId: string
  reason?: string
  delaySeconds?: number
  template?: string
  to?: string
  traceId?: string | null
}

export async function retryEmailNotification(input: RetryEmailInput) {
  if (!input.messageId) throw new Error('messageId is required')

  const payload = {
    messageId: input.messageId,
    template: input.template ?? null,
    to: input.to ?? null,
  }

  await logEvent({
  level: 'INFO',                              // 🔁 เดิม 'info'
  event: 'retry.email.requested',
  source: 'retry',
  message: 'Retry email requested',           // (เสริม อ่านง่ายเวลาไล่ log)
  data: { ...payload, reason: input.reason ?? 'manual' }, // 🔁 เดิม payload: ...
});

  const res = await queueRetry({
    type: 'email',
    reason: input.reason ?? 'manual',
    delaySeconds: input.delaySeconds ?? 0,
    payload,
    traceId: input.traceId ?? undefined,
  })

  await logEvent({
    level: 'info',
    event: 'retry.email.queued',
    source: 'retry',
    payload: { id: res.id ?? null, queued: res.queued, ...payload },
    meta: { traceId: input.traceId ?? null },
  })

  return res
}
