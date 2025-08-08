// api/retry/process.ts
import { NextRequest, NextResponse } from 'next/server'
import { getLogByTraceId, insertLog, type LogRow } from '@/lib/logs'
import { retryStripeFlow } from '@/lib/retry/stripe'
import { retryPayPalFlow } from '@/lib/retry/paypal'
import { retryEmailNotification } from '@/lib/retry/email'

export const runtime = 'nodejs'

type Body = {
  traceId: string
  // optional overrides
  channel?: 'stripe' | 'paypal' | 'email'
  reason?: string
  delaySeconds?: number
  // email overrides
  messageId?: string
  to?: string
  template?: string
}

function pickChannelFromSource(src?: string): 'stripe' | 'paypal' | 'email' | null {
  if (!src) return null
  const s = src.toLowerCase()
  if (s.includes('stripe')) return 'stripe'
  if (s.includes('paypal')) return 'paypal'
  if (s.includes('sendgrid') || s.includes('email') || s.includes('mailer')) return 'email'
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body
    if (!body?.traceId) {
      return NextResponse.json({ error: 'traceId is required' }, { status: 400 })
    }

    const logs: LogRow[] = await getLogByTraceId(body.traceId)
    if (!logs || logs.length === 0) {
      return NextResponse.json({ error: 'No logs found for traceId' }, { status: 404 })
    }

    // ใช้ตัวล่าสุดเป็นตัวชี้นำ
    const latest = logs[0]
    const source = body.channel ?? pickChannelFromSource(latest.source)
    const reason = body.reason ?? 'manual'
    const delaySeconds = body.delaySeconds ?? 0

    if (!source) {
      await insertLog({
        event: 'retry.process.skipped',
        source: 'retry',
        level: 'warn',
        payload: { traceId: body.traceId, latestSource: latest.source },
        meta: { note: 'Unable to infer channel from source' },
        traceId: body.traceId,
      })
      return NextResponse.json({ error: 'Unable to infer channel from source' }, { status: 422 })
    }

    let result: any

    if (source === 'stripe') {
      const payload = latest.payload ?? {}
      result = await retryStripeFlow({
        chargeId: payload.chargeId ?? payload.charge_id ?? null,
        paymentIntentId: payload.paymentIntentId ?? payload.payment_intent_id ?? null,
        reason,
        delaySeconds,
        traceId: body.traceId,
      })
    } else if (source === 'paypal') {
      const payload = latest.payload ?? {}
      result = await retryPayPalFlow({
        orderId: payload.orderId ?? payload.order_id ?? null,
        captureId: payload.captureId ?? payload.capture_id ?? null,
        reason,
        delaySeconds,
        traceId: body.traceId,
      })
    } else if (source === 'email') {
      // email: อนุญาต override จาก body ถ้าให้มา
      const payload = latest.payload ?? {}
      const messageId =
        body.messageId ??
        payload.messageId ??
        payload.message_id ??
        latest.meta?.messageId ??
        latest.meta?.message_id

      if (!messageId) {
        return NextResponse.json(
          { error: 'messageId is required for email retry' },
          { status: 400 },
        )
      }

      result = await retryEmailNotification({
        messageId,
        template: body.template ?? payload.template ?? null,
        to: body.to ?? payload.to ?? null,
        reason,
        delaySeconds,
        traceId: body.traceId,
      })
    } else {
      return NextResponse.json({ error: `Unsupported channel: ${source}` }, { status: 400 })
    }

    await insertLog({
      event: 'retry.process.completed',
      source: 'retry',
      level: 'info',
      payload: { channel: source, result },
      meta: { fromSource: latest.source },
      traceId: body.traceId,
    })

    return NextResponse.json({ ok: true, channel: source, result }, { status: 200 })
  } catch (err: any) {
    console.error('[retry/process] error', err)
    await insertLog({
      event: 'retry.process.error',
      source: 'retry',
      level: 'error',
      payload: { message: err?.message ?? 'unknown error' },
      traceId: undefined,
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
