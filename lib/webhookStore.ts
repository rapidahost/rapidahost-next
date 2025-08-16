// lib/webhookStore.ts
export async function wasProcessed(eventId: string) {
  // query DB หา record eventId + status=processed
  return false;
}
export async function markProcessed(eventId: string, payload: any) {
  // upsert eventId + payload + processed_at
}
export function extractMapping(resource: any): { clientId?: number; invoiceId?: number; serviceId?: number } {
  // 1) ลองอ่านจาก resource.custom_id (เช่น "3:3:1")
  const custom = resource?.custom_id as string | undefined;
  if (custom && custom.includes(":")) {
    const [c, i, s] = custom.split(":");
    return { clientId: Number(c), invoiceId: Number(i), serviceId: Number(s) };
  }
  // 2) ตกลง default (หาเพิ่มจากระบบคุณ เช่น invoiceNo → invoiceId)
  return {};
}

