// /lib/logging/logEvent.ts
// Back-compat shims — ใช้ของใหม่แต่คงชื่อเดิมให้โค้ดเก่าทำงานได้
export { insertLog as logger } from '../logger';
export { insertLog as logEvent } from '../logger';  // 👈 เพิ่มบรรทัดนี้
export * from '../logger';

