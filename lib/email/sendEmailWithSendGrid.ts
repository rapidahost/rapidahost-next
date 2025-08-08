// lib/email/sendEmailWithSendGrid.ts
import sgMail from '@sendgrid/mail'

type SendEmailArgs = {
  to: string | string[]
  subject?: string
  html?: string
  templateId?: string
  dynamicTemplateData?: Record<string, any>
  fromEmail?: string
  fromName?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'no-reply@rapidahost.com'
const FROM_NAME  = process.env.SENDGRID_FROM_NAME  || 'Rapidahost'
const API_KEY    = process.env.SENDGRID_API_KEY || ''

let initialized = false
function ensureInit() {
  if (!initialized) {
    if (!API_KEY) throw new Error('Missing SENDGRID_API_KEY')
    sgMail.setApiKey(API_KEY)
    initialized = true
  }
}

/**
 * Production-ready SendGrid sender
 * - รองรับ Dynamic Template หรือ subject+html ปกติ
 * - รองรับ CC/BCC/Reply-To
 * - รองรับ sandbox mode เมื่อไม่ใช่ production (ถ้าตั้ง SENDGRID_SANDBOX=true)
 */
export async function sendEmailWithSendGrid(args: SendEmailArgs) {
  ensureInit()

  const {
    to,
    subject,
    html,
    templateId = process.env.SENDGRID_TEMPLATE_ID, // เผื่อค่า default
    dynamicTemplateData,
    fromEmail = FROM_EMAIL,
    fromName  = FROM_NAME,
    cc,
    bcc,
    replyTo,
  } = args

  const useTemplate = Boolean(templateId)

  if (!useTemplate && (!subject || !html)) {
    throw new Error('Either templateId or (subject & html) is required')
  }

  const msg: any = {
    to,
    from: { email: fromEmail, name: fromName },
    cc,
    bcc,
    replyTo,
    mailSettings:
      process.env.NODE_ENV !== 'production' && process.env.SENDGRID_SANDBOX === 'true'
        ? { sandboxMode: { enable: true } }
        : undefined,
  }

  if (useTemplate) {
    msg.templateId = templateId
    if (dynamicTemplateData) msg.dynamicTemplateData = dynamicTemplateData
  } else {
    msg.subject = subject
    msg.html = html
  }

  try {
    const [resp] = await sgMail.send(msg)
    return {
      success: true,
      statusCode: resp?.statusCode,
      messageId: resp?.headers?.['x-message-id'] || resp?.headers?.['x-message-id'.toLowerCase()],
    }
  } catch (err: any) {
    const sgErr = err?.response?.body || err?.message || err
    console.error('[SendGrid] send failed:', sgErr)
    throw new Error(typeof sgErr === 'string' ? sgErr : JSON.stringify(sgErr))
  }
}

export default sendEmailWithSendGrid
