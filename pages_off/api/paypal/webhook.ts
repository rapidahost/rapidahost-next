// pages/api/paypal/webhook.ts (เติมต่อของเดิม)
import { wasProcessed, markProcessed, extractMapping } from "@/lib/webhookStore";
import { markInvoicePaid, markInvoiceRefunded, markInvoiceFailed } from "@/lib/invoice";
import { activateService, suspendService } from "@/lib/service";
import { sendEmailPaid, sendEmailWelcome, sendEmailRefunded, sendEmailFailed } from "@/lib/email/flows";

...

// หลัง verify แล้ว
const eventId = event?.id;
if (!eventId) {
  await logEvent({ source:'paypal', event:'webhook_invalid', status:'failed', message:'missing event.id' }, 'warn');
  return res.status(400).json({ error: 'missing event id' });
}

if (await wasProcessed(eventId)) {
  await logEvent({ source:'paypal', event:'webhook_dup', status:'success', message:'duplicate ignored', metadata:{eventId}}, 'info');
  return res.status(200).json({ received: true });
}

const eventType = event?.event_type ?? "unknown";
const resource = event?.resource ?? {};
const map = extractMapping(resource);  // {clientId, invoiceId, serviceId}

switch (eventType) {
  case "PAYMENT.CAPTURE.COMPLETED":
  case "CHECKOUT.ORDER.APPROVED": {
    if (!map.invoiceId || !map.clientId) {
      await logEvent({ source:'paypal', event:'payment_pending_map', status:'info', message:'mapping not found', metadata:{ resource } }, 'warn');
      break; // อนุโลม: ให้ทีมเข้าไป match manual หรือ queue retry
    }
    await markInvoicePaid(map.invoiceId, { txnId: resource?.id, raw: resource });
    if (map.serviceId) await activateService(map.serviceId);
    await sendEmailPaid(map.clientId, map.invoiceId);
    if (map.serviceId) await sendEmailWelcome(map.clientId, map.serviceId);
    break;
  }

  case "PAYMENT.CAPTURE.DENIED": {
    if (map.invoiceId) await markInvoiceFailed(map.invoiceId, { reason: "denied" });
    if (map.serviceId) await suspendService(map.serviceId);
    await sendEmailFailed(map.clientId!, map.invoiceId!);
    break;
  }

  case "PAYMENT.CAPTURE.REFUNDED":
  case "PAYMENT.CAPTURE.REVERSED": {
    if (map.invoiceId) await markInvoiceRefunded(map.invoiceId, { reason: eventType.toLowerCase() });
    if (map.serviceId) await suspendService(map.serviceId); // ตามนโยบาย
    await sendEmailRefunded(map.clientId!, map.invoiceId!);
    break;
  }

  default:
    await logEvent({ source:'paypal', event:'webhook_unhandled', status:'info', message:`Unhandled ${eventType}` }, 'info');
}

await markProcessed(eventId, event);
return res.status(200).json({ received: true });
