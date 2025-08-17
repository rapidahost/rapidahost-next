// lib/retry/email.ts
import { queueRetry } from '@/lib/retry/queueRetry'
import { logEvent } from '@/lib/logging'

export type RetryEmailInput = {
  messageId: string
  template: string
  to: string
  reason?: string
  delaySeconds?: number
  traceId?: string
}

export async function requestRetryEmail(input: RetryEmailInput) {
  const payload = {
    messageId: input.messageId,
    template: input.template,
    to: input.to,
  }

  // Log: requested (ใช้ meta เพื่อส่งรายละเอียดเพิ่ม แทนการใช้ payload)
  await logEvent('retry.email.requested', {
    source: 'retry',
    ...payload,
    reason: input.reason ?? 'manual',
    traceId: input.traceId,
    level: 'INFO', // คงคอนเวนชันตัวพิมพ์ใหญ่; ฟังก์ชัน logEvent จะไม่ล้มแม้ไม่ได้ใช้ค่านี้
  })

  // เข้าคิว retry (บางโปรเจกต์ type เข้มงวดต่างกัน แคสต์เป็น any เพื่อหลีกเลี่ยง TS error เรื่องฟิลด์เสริม)
  const res = await queueRetry({
    type: 'email',
    reason: input.reason ?? 'manual',
    delaySeconds: input.delaySeconds ?? 0,
    payload,
    traceId: input.traceId,
  } as any)

  // Log: queued
  await logEvent('retry.email.queued', {
    source: 'retry',
    id: (res as any)?.id ?? null,
    queued: !!(res as any)?.queued,
    ...payload,
    level: 'INFO',
  })

  return res
}
