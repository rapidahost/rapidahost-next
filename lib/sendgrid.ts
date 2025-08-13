// File: lib/sendgrid.ts
export type SendGridResult = { ok: boolean; status: number; traceId: string; error?: string };

const TID = () =>
  `SG-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0,14)}-${Math.random()
    .toString(36)
    .slice(-4)
    .toUpperCase()}`;

/** เดิมบางไฟล์ import sendEmailWithSendGrid จาก @lib/sendgrid */
export async function sendEmailWithSendGrid(
  to: string,
  subject: string,
  html: string,
  fromEmail?: string,
  fromName?: string
): Promise<SendGridResult> {
  const traceId = TID();
  const key = process.env.SENDGRID_API_KEY || process.env.SENDGRID_API || '';
  const from =
    fromEmail || process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_FROM || 'noreply@example.com';
  const name = fromName || process.env.SENDGRID_FROM_NAME || 'Rapidahost';
  if (!key) return { ok: false, status: 0, traceId, error: 'Missing SENDGRID_API_KEY' };

  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });
  return { ok: resp.ok, status: resp.status, traceId, error: resp.ok ? undefined : await resp.text() };
}
