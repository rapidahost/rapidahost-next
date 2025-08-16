// lib/retry/email.ts
import { resendEmailByMessageId } from '../email/sendgrid';
import { insertLog } from '../supabase/logs';

export async function retryEmail(messageId: string, reason: string, traceId: string) {
  try {
    const result = await resendEmailByMessageId(messageId);
    await insertLog({
      traceId,
      type: 'email-retry',
      status: 'success',
      message: `Email retried: ${messageId}`,
      metadata: { messageId, result, reason },
    });
    return { success: true };
  } catch (error) {
    await insertLog({
      traceId,
      type: 'email-retry',
      status: 'failed',
      message: `Retry failed: ${messageId}`,
      metadata: { error: (error as Error).message, reason },
    });
    return { success: false, error };
  }
}

