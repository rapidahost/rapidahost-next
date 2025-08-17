// lib/retry/paypal.ts
import { queueRetry } from '@/lib/retry/queueRetry'
import { logEvent } from '@/lib/logging'

export type RetryPaypalInput = {
  reason?: string
  delaySeconds?: number
  traceId?: string
  // อนุญาตฟิลด์อื่น ๆ ของเพย์พาลตามที่มีอยู่จริง
  [key: string]: any
}

export async function requestRetryPaypal(input: RetryPaypalInput) {
  // ดึงฟิลด์ควบคุมออก แล้วที่เหลือถือเป็น payload ของงาน retry
  const { reason, delaySeconds, traceId, ...payload } = (input || {}) as Record<string, any>

  // Log: requested — ย้ายข้อมูลเสริมไปไว้ใน meta
  await logEvent('retry.paypal.requested', {
    source: 'retry',
    ...payload,
    reason: reason ?? 'manual',
    traceId,
    level: 'INFO',
  })

  // คิวงาน retry (แคสต์ any กัน type แตกต่างกันในโปรเจกต์)
  const res = await queueRetry({
    type: 'paypal',
    reason: reason ?? 'manual',
    delaySeconds: delaySeconds ?? 0,
    payload,
    traceId,
  } as any)

  // Log: queued
  await logEvent('retry.paypal.queued', {
    source: 'retry',
    id: (res as any)?.id ?? null,
    queued: !!(res as any)?.queued,
    ...payload,
    level: 'INFO',
  })

  return res
}
