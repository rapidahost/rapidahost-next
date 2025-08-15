// /lib/logs.ts - backward-compat shim (no circular imports)
export {
  insertLog,
  logInfo,
  logWarn,
  logError,
  logDebug,
  logger,         // alias ให้ของเดิมที่ import { logger } ได้
} from './logger';

export type { LogEvent, LogLevel, LogStatus } from './logger';
