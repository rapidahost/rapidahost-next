// /api/paypal/webhook.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { buffer } from 'micro'
import { verifyPayPalWebhookSignature } from '@/lib/paypal/verifySignature'
import { createWHMCSClientAndInvoice } from '@/lib/whmcs/createWHMCSClientAndInvoice'
import { logEvent } from '@/lib/logging/logEvent'
import { queueRetry } from '@/lib/retry/queueRetry'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const isValid = await verifyPayPalWebhookSignature(req)
  if (!isValid) {
    await logEvent({
      source: 'paypal',
      type: 'webhook',
      status: 'failed',
      message: 'Invalid PayPal signature',
      traceId: 'paypal_invalid_sig'
    })
    return res.status(400).json({ error: 'Invalid signature' })
  }

  const rawBody = await buffer(req)
  const event = JSON.parse(rawBody.toString())

  switch (event.event_type) {
    case 'PAYMENT.CAPTURE.COMPLETED': {
      try {
        const metadata = event.resource.custom_id ? JSON.parse(event.resource.custom_id) : {}

        const result = await createWHMCSClientAndInvoice({
          email: event.resource.payer.email_address,
          name: `${event.resource.payer.name.given_name} ${event.resource.payer.name.surname}`,
          plan_id: metadata.plan_id,
          payment_method: 'paypal',
          promocode: metadata.promocode,
          billingcycle: metadata.billingcycle
        })

        // ส่ง Welcome Email
        const emailRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/email/welcome`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: result.clientId,
            password: result.password || ''
          })
        })

        await logEvent({
          source: 'paypal',
          type: 'checkout',
          status: 'success',
          clientId: result.clientId,
          invoiceId: result.invoiceId,
          serviceId: result.serviceId,
          traceId: `paypal_${event.resource.id}`,
          message: 'PayPal payment processed and client created',
          links: {
            client: `/admin/client/${result.clientId}`,
            invoice: `/admin/invoice/${result.invoiceId}`,
            email: `/admin/email?clientId=${result.clientId}`
          }
        })

      } catch (error) {
        const errMessage = error instanceof Error ? error.message : 'Unknown error';
        await queueRetry({
          source: 'paypal',
          event: event,
          reason: errMessage,
          traceId: `paypal_${event.resource.id}`
        });

        await logEvent({
          source: 'paypal',
          type: 'checkout',
          status: 'failed',
          message: errMessage,
          traceId: `paypal_${event.resource.id}`
        })
        return res.status(500).json({ error: 'Internal error' })
      }
      break
    }

    default:
      console.log('Unhandled PayPal event:', event.event_type)
  }

  res.status(200).json({ received: true })
}

// ... (โค้ดเดิมทั้งหมดด้านบนเหมือนเดิม)
const [servicesTab, setServicesTab] = useState<'services' | 'emails' | 'logs'>('services');
const [emailPage, setEmailPage] = useState(1);
const [statusFilter, setStatusFilter] = useState('');
const [logPage, setLogPage] = useState(1);
const [logFilter, setLogFilter] = useState('');
const itemsPerPage = 5;

const emailLogs = (client.emails || []).filter((email: any) =>
  !statusFilter || email.status === statusFilter
);

const retryLogs = (client.logs || []).filter((log: any) =>
  log.retryCount > 0 && (!logFilter || log.status === logFilter)
);

const paginatedEmails = emailLogs.slice((emailPage - 1) * itemsPerPage, emailPage * itemsPerPage);
const paginatedLogs = retryLogs.slice((logPage - 1) * itemsPerPage, logPage * itemsPerPage);

const exportRetryCSV = () => {
  const csv = [
    ['Trace ID', 'Type', 'Status', 'Retries', 'Timestamp'].join(',')
  ];
  retryLogs.forEach(log => {
    csv.push([
      log.traceId,
      log.type,
      log.status,
      log.retryCount,
      new Date(log.timestamp).toLocaleString()
    ].map(v => `"${v}"`).join(','));
  });
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'retry_logs.csv';
  link.click();
};

{servicesTab === 'logs' && (
  <div className="overflow-x-auto space-y-3">
    <div className="flex justify-between items-center">
      <div className="text-sm font-medium">Total: {retryLogs.length} logs</div>
      <div className="flex items-center space-x-2">
        <select
          value={logFilter}
          onChange={(e) => setLogFilter(e.target.value)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="">All</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <button
          onClick={exportRetryCSV}
          className="text-sm bg-gray-100 hover:bg-gray-200 border rounded px-3 py-1"
        >Export CSV</button>
      </div>
    </div>
    <table className="w-full text-sm border">
      <thead>
        <tr className="bg-gray-100 text-left">
          <th className="p-2 border">Trace ID</th>
          <th className="p-2 border">Type</th>
          <th className="p-2 border">Status</th>
          <th className="p-2 border">Retries</th>
          <th className="p-2 border">Date</th>
        </tr>
      </thead>
      <tbody>
        {paginatedLogs.map((log: any, i: number) => (
          <tr key={i} className="border-t">
            <td className="p-2 border text-blue-600 underline">
              <Link href={`/admin/logs/${log.traceId}`}>{log.traceId}</Link>
            </td>
            <td className="p-2 border">{log.type}</td>
            <td className="p-2 border">{log.status}</td>
            <td className="p-2 border">{log.retryCount}</td>
            <td className="p-2 border">{new Date(log.timestamp).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="flex justify-between text-sm mt-2">
      <button disabled={logPage === 1} onClick={() => setLogPage(logPage - 1)} className="px-3 py-1 rounded border bg-white disabled:opacity-50">← Prev</button>
      <div>Page {logPage} of {Math.ceil(retryLogs.length / itemsPerPage)}</div>
      <button disabled={logPage * itemsPerPage >= retryLogs.length} onClick={() => setLogPage(logPage + 1)} className="px-3 py-1 rounded border bg-white disabled:opacity-50">Next →</button>
    </div>
  </div>
)}
