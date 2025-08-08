// lib/retry/queueRetry.ts
/**
 * Queue a retry job (email/invoice/webhook) to Supabase table `retry_jobs`.
 * Falls back to console when ENV is missing, so build never breaks.
 */

export type RetryType = 'email' | 'invoice' | 'webhook'

export interface QueueRetryInput {
  type: RetryType
  messageId?: string
  reason?: string
  payload?: Record<string, any>
  delaySeconds?: number    // default: 60
  maxAttempts?: number     // default: 5
  clientId?: string | number
  invoiceId?: string | number
  serviceId?: string | number
}

export interface QueueRetryResult {
  queued: boolean
  id?: string | number
  fallback?: boolean
}

function hasSupabaseEnv() {
  return Boolean(process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY))
}

export async function queueRetry(input: QueueRetryInput): Promise<QueueRetryResult> {
  const {
    type,
    messageId,
    reason,
    payload = {},
    delaySeconds = 60,
    maxAttempts = 5,
    clientId,
    invoiceId,
    serviceId,
  } = input

  // next run time
  const nextRunAt = new Date(Date.now() + delaySeconds * 1000).toISOString()

  // ไม่มี ENV → fallback
  if (!hasSupabaseEnv()) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[queueRetry:fallback]', {
        type, messageId, reason, payload, nextRunAt, maxAttempts, clientId, invoiceId, serviceId,
      })
    }
    return { queued: true, fallback: true }
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY) as string,
      { auth: { persistSession: false } }
    )

    const row = {
      type,
      message_id: messageId ?? null,
      reason: reason ?? null,
      payload,
      next_run_at: nextRunAt,
      attempts: 0,
      max_attempts: maxAttempts,
      status: 'queued', // queued | running | done | failed
      client_id: clientId ? String(clientId) : null,
      invoice_id: invoiceId ? String(invoiceId) : null,
      service_id: serviceId ? String(serviceId) : null,
    }

    const { data, error } = await supabase.from('retry_jobs').insert(row).select().maybeSingle()
    if (error) {
      console.warn('[queueRetry] supabase insert error:', error)
      return { queued: false }
    }
    return { queued: true, id: data?.id }
  } catch (e: any) {
    console.warn('[queueRetry] unexpected error:', e?.message || e)
    return { queued: false }
  }
}

export default queueRetry
