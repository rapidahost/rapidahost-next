import { NextRequest, NextResponse } from 'next/server'
import { queueRetry } from '@/lib/retry/queueRetry'
import { logEvent } from '@/lib/logging/logEvent'

/**
 * POST /api/retry-email
 * ใช้สำหรับ CRON/Queue เรียกให้รีทไรอีเมลที่ล้มเหลว
 * Auth โดยตรวจ CRON_SECRET จาก header หรือ query
 */

export async function POST(req: NextRequest) {
  // --- Auth: ตรวจ CRON_SECRET ---
  const cronSecret = process.env.CRON_SECRET || ''
  const incomingSecret =
    req.headers.get('x-cron-secret') ||
    new URL(req.url).searchParams.get('secret') ||
    ''

  if (!cronSecret || incomingSecret !== cronSecret) {
    const ip = getClientIp(req)
    await logEvent({
      level: 'warn',
      event: 'retry_email.unauthorized',
      source: 'api',
      payload: {
        ip,
        userAgent: req.headers.get('user-agent'),
        forwardedFor: req.headers.get('x-forwarded-for'),
      },
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { messageId, reason = 'manual_retry', delaySeconds = 0 } = body ?? {}

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 })
    }

    // ใส่คิวรีทไร (เขียน Supabase ถ้ามี ENV; ถ้าไม่มีจะ fallback console)
    const result = await queueRetry({
      type: 'email',
      messageId,
      reason,
      delaySeconds,
      payload: { triggeredBy: 'api/retry-email' },
    })

    await logEvent({
      level: 'info',
      event: 'retry_email.queued',
      source: 'api',
      payload: { messageId, reason, delaySeconds, result },
    })

    return NextResponse.json({ ok: true, queued: result.queued, id: result.id ?? null })
  } catch (err: any) {
    await logEvent({
      level: 'error',
      event: 'retry_email.error',
      source: 'api',
      payload: { message: err?.message || String(err) },
      meta: { stack: err?.stack },
    })
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}

/** ดึง IP จาก header เพราะ NextRequest ไม่มี req.ip */
function getClientIp(req: NextRequest): string | null {
  const xfwd = req.headers.get('x-forwarded-for') // e.g., "1.2.3.4, 5.6.7.8"
  if (xfwd) return xfwd.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return null
}
