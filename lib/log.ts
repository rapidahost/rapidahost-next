// /lib/logs.ts — back-compat shim (no self-imports)
export {
  insertLog,
  logInfo,
  logWarn,
  logError,
  logDebug,
  logger, // alias สำหรับโค้ดเก่าที่ import { logger }
} from './logger';

export type { LogEvent, LogLevel, LogStatus } from './logger';

