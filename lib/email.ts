// lib/email.ts — ใช้ REST ของ SendGrid แทน SDK
export async function sendEmail({
  to,
  subject,
  html,
  fromEmail = process.env.SENDGRID_FROM_EMAIL!,
  fromName = process.env.SENDGRID_FROM_NAME || "Rapidahost",
}: {
  to: string;
  subject: string;
  html: string;
  fromEmail?: string;
  fromName?: string;
}) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY not set");
  }
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }], subject }],
      from: { email: fromEmail, name: fromName },
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SendGrid failed ${res.status}: ${text.slice(0, 300)}`);
  }
}

