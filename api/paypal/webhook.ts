import { logEvent } from '@/lib/logging';

await logEvent({
  source: 'paypal',            // แหล่งเหตุการณ์
  event: 'webhook.received',   // โค้ดเหตุการณ์
  status: 'ok',                // ok|warn|failed
  message: 'Webhook verified', // สรุปสั้นๆ
  traceId: orderId || requestId,
  metadata: { ...someContext } // ใส่เฉพาะข้อมูลที่ไม่ละเอียดอ่อน
});
