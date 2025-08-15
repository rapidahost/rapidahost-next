// lib/logger.ts
// Minimal logger that works on both server/client without extra deps.
// - Console logs always
// - Optionally POST ไปยัง /api/logs (ถ้ากำหนด NEXT_PUBLIC_BASE_URL + ADMIN_API_KEY)

type Level = 'debug' | 'info' | 'warn' | 'error';

export type LogEvent = {
  source: string;          // เช่น 'paypal:webhook' | 'api:currencies'
  event: string;           // เช่น 'received' | 'error'
  status?: 'ok' | 'fail' | string;
  message?: string;
  traceId?: string;
  metadata?: unknown;
  level?: Level;
};

function nowISO() {
  try {
    return new Date().toISOString();
  } catch {
    return '' + Date.now();
  }
}

async function postToInternalLogs(payload: LogEvent) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.LOCAL_API_BASE_URL;
  const key = process.env.ADMIN_API_KEY;
  const url = internalApiUrl('/api/logs/ingest');
  if (!base || !key) return;

  try {
    await fetch(`${base.replace(/\/+$/, '')}/api/logs`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-key'  : key,
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // เงียบไว้ ไม่ให้ throw ไปพัง endpoint หลัก
  }
}

function consoleLog(level: Level, payload: LogEvent) {
  const line = {
    ts: nowISO(),
    level,
    source: payload.source,
    event: payload.event,
    status: payload.status,
    traceId: payload.traceId,
    message: payload.message,
    metadata: payload.metadata,
  };

  // อย่าพังบนเบราว์เซอร์เก่า
  try {
    // eslint-disable-next-line no-console
    (console[level] ?? console.log)(`[${level}]`, line);
  } catch {
    // eslint-disable-next-line no-console
    console.log(`[${level}]`, line);
  }
}

async function emit(level: Level, payload: LogEvent) {
  const withLevel = { ...payload, level };
  consoleLog(level, withLevel);
  // ส่งเข้า /api/logs แบบ best-effort เท่านั้น
  await postToInternalLogs(withLevel);
}

export const logger = {
  debug: (p: Omit<LogEvent, 'level'>) => emit('debug', p),
  info : (p: Omit<LogEvent, 'level'>) => emit('info', p),
  warn : (p: Omit<LogEvent, 'level'>) => emit('warn', p),
  error: (p: Omit<LogEvent, 'level'>) => emit('error', p),
};

// เพื่อให้ imports เดิมที่ใช้ default ยังทำงานได้
export default logger;

// helper สั้น ๆ ให้โค้ดเก่าใช้ชื่อเดิมได้ (ถ้าคุณมีฟังก์ชัน logEvent ในโปรเจ็กต์)
export const logEvent = (p: LogEvent) => logger.info(p);
