// lib/logger.ts
import { Logtail } from "@logtail/node";

// ใช้ ENV จาก .env.local
export const logger = new Logtail(process.env.LOGTAIL_TOKEN!);

