// lib/logging.ts
// ให้ไฟล์อื่น import '@/lib/logging' ได้ แมปไป logger เดียวกัน
type Meta = Record<string, unknown> | undefined

export const logger = {
  info: (msg: string, meta?: Meta) => console.log('[INFO]', msg, meta ?? ''),
  warn: (msg: string, meta?: Meta) => console.warn('[WARN]', msg, meta ?? ''),
  error: (msg: string, meta?: Meta) => console.error('[ERROR]', msg, meta ?? ''),
}

export default logger
