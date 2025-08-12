// lib/sendgrid.ts — ใช้ REST โดยตรง ไม่ต้อง @sendgrid/mail
type SendTemplateArgs = {
  to: string
  dynamicData?: Record<string, any>
  templateId?: string // ถ้าไม่ส่ง จะใช้ค่าเริ่มจาก ENV
}

export async function sendEmailWithTemplate(args: SendTemplateArgs) {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) throw new Error('SENDGRID_API_KEY is missing')

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'no-reply@rapidahost.com'
  const fromName  = process.env.SENDGRID_FROM_NAME  || 'Rapidahost'
  const templateId = args.templateId || process.env.SENDGRID_TEMPLATE_GENERIC
  if (!templateId) throw new Error('SendGrid templateId missing')

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      personalizations: [{
        to: [{ email: args.to }],
        dynamic_template_data: args.dynamicData || {}
      }],
      template_id: templateId
    })
  })

  if (!res.ok) {
    const txt = await res.text().catch(()=> '')
    throw new Error(`SendGrid error ${res.status}: ${txt}`)
  }
}
