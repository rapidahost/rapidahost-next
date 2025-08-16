// lib/retry/email.ts
import { queueRetry } from '@/lib/retry/queueRetry'
import { logEvent } from '@/lib/logging/logEvent'

export type RetryEmailInput = {
  messageId: string
  template: string
  to: string
  reason?: string
  delaySeconds?: number
  traceId?: string
}

export async function retryEmail(input: RetryEmailInput) {
  const payload = {
    messageId: input.messageId,
    template: input.template,
    to: input.to,
  }

  // log: requested
  await logEvent({
    level: 'INFO', // <- ใช้ตัวใหญ่
    event: 'retry.email.requested',
    source: 'retry',
    payload: { ...payload, reason: input.reason ?? 'manual' },
    traceId: input.traceId,
  })

  // enqueue retry (อย่าใส่ traceId ถ้า QueueRetryInput ไม่รองรับ)
  const res = await queueRetry({
    type: 'email',
    reason: input.reason ?? 'manual',
    delaySeconds: input.delaySeconds ?? 0,
    payload,
    // โปรเจ็กต์นี้ต้องการ step ใน QueueRetryInput
    step: 'send',
  })

  // log: queued
  await logEvent({
    level: 'INFO', // <- ใช้ตัวใหญ่
    event: 'retry.email.queued',
    source: 'retry',
    payload: { id: res?.id ?? null, queued: res?.queued ?? true, ...payload },
    traceId: input.traceId,
  })

  return { ok: true, id: res?.id ?? null }
}

