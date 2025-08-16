// lib/logging.ts

// ใช้ตัวพิมพ์ใหญ่ทั้งหมดให้สอดคล้องกับที่แก้ไว้ที่อื่น
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

export type LogMeta = Record<string, unknown>

export type LogEventRow = {
  level: LogLevel
  event: string
  meta?: LogMeta
}

/**
 * logEvent(event, meta)
 * หมายเหตุ: ไว้ใช้แบบเบาๆ ฝั่ง client/server ก็ได้
 * ถ้ามี ENDPOINT ภายใน (api/logs/ingest) และมี ADMIN_API_KEY จะโพสต์ไปให้ด้วย
 */
export async function logEvent(event: string, meta?: LogMeta): Promise<void> {
  const row: LogEventRow = { level: 'INFO', event, meta }

  try {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.LOCAL_API_BASE_URL ||
      ''
    const url = base ? `${base}/api/logs/ingest` : ''
    const key = process.env.ADMIN_API_KEY

    if (url && key) {
      await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-key': key,
        },
        body: JSON.stringify({ source: 'client', ...row }),
      })
    }
  } catch {
    // ไม่ต้องทำอะไร ป้องกันไม่ให้ logging ทำให้แอปพัง
  }
}
