// lib/invoice.ts
export async function markInvoicePaid(invoiceId: number, opts: { txnId?: string; raw?: any }) { /* DB update */ }
export async function markInvoiceRefunded(invoiceId: number, opts?: any) { /* DB update */ }
export async function markInvoiceFailed(invoiceId: number, opts?: any) { /* DB update */ }

// lib/service.ts
export async function activateService(serviceId: number) { /* call WHMCS / DB set Active */ }
export async function suspendService(serviceId: number) { /* call WHMCS / DB set Suspended */ }

// lib/email/flows.ts (เรียก SendGrid template จริง)
export async function sendEmailPaid(clientId: number, invoiceId: number) { /* template: payment_success */ }
export async function sendEmailWelcome(clientId: number, serviceId: number) { /* template: welcome */ }
export async function sendEmailRefunded(clientId: number, invoiceId: number) { /* template: refund */ }
export async function sendEmailFailed(clientId: number, invoiceId: number) { /* template: failed */ }
