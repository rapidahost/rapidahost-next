// lib/email.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendEmailWithSendGrid({
  to,
  templateId,
  dynamicTemplateData,
}: {
  to: string
  templateId: string
  dynamicTemplateData: Record<string, any>
}) {
  const msg = {
    to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL!,
      name: process.env.SENDGRID_FROM_NAME!,
    },
    templateId,
    dynamicTemplateData,
  }

  await sgMail.send(msg)
}
