// /lib/logger.ts
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
export type LogStatus = 'Success' | 'Failed' | 'Pending';

export type LogEvent = {
  traceId?: string;
  source: string;
  event: string;
  message?: string;
  level?: LogLevel;
  status?: LogStatus;
  data?: any;
};

const isServer = typeof window === 'undefined';

// ใช้ BASE เฉพาะฝั่ง client; ฝั่ง server ให้เรียก path ตรง ๆ
function internalApiUrl(path: string) {
  if (isServer) return path;
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process as any).env?.LOCAL_API_BASE_URL ||
    '';
  return base ? `${base}${path}` : path;
}

export async function insertLog(log: LogEvent | LogEvent[]) {
  const url = internalApiUrl('/api/logs/ingest');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ใส่ admin key เฉพาะฝั่ง server (env นี้ไม่ถูก expose ไป client)
        ...(isServer && process.env.ADMIN_API_KEY
          ? { 'x-admin-key': process.env.ADMIN_API_KEY as string }
          : {}),
      },
      body: JSON.stringify(log),
    });

    if (!res.ok) {
      const t = await res.text();
      // ไม่ throw เพื่อไม่พัง flow หลัก
      console.error('[insertLog] failed:', res.status, t);
    }
  } catch (e) {
    console.error('[insertLog] exception:', e);
  }
}

// helpers
export const logInfo = (p: Omit<LogEvent, 'level'>) => insertLog({ ...p, level: 'INFO' });
export const logWarn = (p: Omit<LogEvent, 'level'>) => insertLog({ ...p, level: 'WARN' });
export const logError = (p: Omit<LogEvent, 'level'>) => insertLog({ ...p, level: 'ERROR' });
export const logDebug = (p: Omit<LogEvent, 'level'>) => insertLog({ ...p, level: 'DEBUG' });

export const logger = insertLog;

