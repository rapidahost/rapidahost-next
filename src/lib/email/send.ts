// src/lib/email/send.ts

export async function resendEmailByMessageId(messageId: string) {
  console.log(`[Mock] resendEmailByMessageId: ${messageId}`);

  // 🔧 ตรงนี้คือ mock เฉย ๆ เอาไว้เชื่อม SendGrid ทีหลัง
  return {
    success: true,
    detail: `Resent email with messageId: ${messageId}`,
  };
}
