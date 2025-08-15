// /lib/logging/logEvent.ts
// Backward-compat: map old `logger(...)` to new insertLog()
// No direct supabase import here (safe on Vercel)

export { insertLog as logger } from '../logger';
export * from '../logger';
