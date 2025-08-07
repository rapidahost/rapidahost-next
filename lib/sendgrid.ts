// lib/sendgrid.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

type SendEmailParams = {
  to: string
  templateId: string
  dynamicTemplateData: Record<string, any>
}

export async function sendEmailWithSendGrid({ to, templateId, dynamicTemplateData }: SendEmailParams) {
  const msg = {
    to,
    from: 'support@rapidahost.com',
    templateId,
    dynamicTemplateData,
  }

  const [response] = await sgMail.send(msg)
  return {
    status: response.statusCode,
    headers: response.headers,
  }
}
