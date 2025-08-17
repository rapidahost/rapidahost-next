// lib/sendgrid.ts
// ใช้ได้เฉพาะฝั่ง Server (API Routes) — ต้องตั้ง ENV: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
// รองรับ Dynamic Template ผ่าน ENV ชื่อ SENDGRID_TEMPLATE_<TEMPLATE_NAME_IN_UPPERCASE>

type SendEmailWithTemplateInput = {
  to: string;
  template: string;                  // ชื่อเทมเพลต เช่น 'welcome', 'test'
  messageId?: string;                // ใส่เป็น header X-Message-Id
  subject?: string;                  // ใช้เมื่อไม่มี Dynamic Template
  variables?: Record<string, any>;   // dynamicTemplateData
  text?: string;                     // fallback เมื่อไม่มี templateId
  html?: string;                     // fallback เมื่อไม่มี templateId
  from?: string;                     // override sender ถ้าต้องการ
};

export async function sendEmailWithTemplate(input: SendEmailWithTemplateInput) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const defaultFrom =
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.SENDGRID_SENDER ||
    process.env.SENDGRID_FROM ||
    '';

  if (!apiKey || !defaultFrom) {
    throw new Error('Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL');
  }

  // lazy import เพื่อกันปัญหา bundling ฝั่ง client/edge
  const sgMail = (await import('@sendgrid/mail')).default;
  sgMail.setApiKey(apiKey);

  // แปลงชื่อ template เป็น ENV key เช่น template='welcome-email' → SENDGRID_TEMPLATE_WELCOME_EMAIL
  const templateEnvKey =
    'SENDGRID_TEMPLATE_' +
    input.template.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const templateId = (process.env as any)[templateEnvKey] as string | undefined;

  const from = input.from ?? defaultFrom;

  let msg: any;
  if (templateId) {
    // ใช้ Dynamic Template
    msg = {
      to: input.to,
      from,
      templateId,
      dynamicTemplateData: {
        ...(input.variables || {}),
        messageId: input.messageId,
      },
      headers: input.messageId
        ? { 'X-Message-Id': input.messageId }
        : undefined,
    };
  } else {
    // Fallback: ส่งอีเมลธรรมดา
    const subject =
      input.subject ?? `[${input.template}] Notification`;
    const text =
      input.text ??
      `Template: ${input.template}\n${JSON.stringify(
        input.variables || {},
      )}`;
    const html =
      input.html ??
      `<p>Template: <strong>${input.template}</strong></p>
       <pre>${escapeHtml(
         JSON.stringify(input.variables || {}, null, 2),
       )}</pre>`;

    msg = {
      to: input.to,
      from,
      subject,
      text,
      html,
      headers: input.messageId
        ? { 'X-Message-Id': input.messageId }
        : undefined,
    };
  }

  const [res] = await sgMail.send(msg, false);
  return {
    ok: res.statusCode >= 200 && res.statusCode < 300,
    statusCode: res.statusCode,
    templateId: templateId ?? null,
  };
}

// ตัวช่วยเล็ก ๆ กัน HTML injection เวลา fallback เป็น HTML
function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
