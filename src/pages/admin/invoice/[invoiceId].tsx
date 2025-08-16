import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const { invoiceId } = router.query;
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/whmcs/invoice?id=${invoiceId}`);
        const data = await res.json();
        setInvoice(data);
      } catch (err) {
        console.error('Failed to fetch invoice', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoiceId]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!invoice) return <div className="p-4 text-red-600">Invoice not found</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="text-2xl font-bold">Invoice #{invoice.id}</div>
      <div>Status: <span className="font-medium">{invoice.status}</span></div>
      <div>Amount: <span className="font-medium">{invoice.amount}</span></div>
      <div>Date: {new Date(invoice.date).toLocaleString()}</div>

      {/* รายการบริการใน Invoice */}
      <div>
        <h3 className="text-lg font-semibold mt-4 mb-2">Line Items</h3>
        <ul className="list-disc pl-6">
          {(invoice.items || []).map((item: any, i: number) => (
            <li key={i}>
              <strong>{item.description}</strong> - {item.amount}
            </li>
          ))}
        </ul>
      </div>

      {/* รายการชำระเงิน */}
      {invoice.transactions?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mt-6 mb-2">Transactions</h3>
          <ul className="list-disc pl-6">
            {invoice.transactions.map((tx: any, i: number) => (
              <li key={i}>
                {tx.date} - {tx.amount} ({tx.paymentmethod})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ปุ่มและลิงก์ */}
      <div className="space-x-4 mt-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => resendEmail(invoice.id)}>Resend Email</button>
        <button className="px-4 py-2 bg-yellow-600 text-white rounded" onClick={() => sendReminder(invoice.id)}>Send Reminder Email</button>
        <a
          href={invoice.downloadUrl || `https://billing.rapidahost.com/viewinvoice.php?id=${invoice.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-gray-700 text-white rounded"
        >
          View PDF
        </a>
        {invoice.status === 'Unpaid' && (
          <a
            href={`https://billing.rapidahost.com/viewinvoice.php?id=${invoice.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Pay Now
          </a>
        )}
        <Link href={`/admin/client/${invoice.clientId}`} className="text-blue-700 underline">Back to Client</Link>
      </div>
    </div>
  );
}

async function resendEmail(invoiceId: string) {
  const confirmed = confirm(`Resend invoice email for Invoice #${invoiceId}?`);
  if (!confirmed) return;
  try {
    await fetch('/api/email/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'invoice', invoiceId })
    });
    alert('Invoice email resent');
  } catch (err) {
    alert('Failed to resend email');
  }
}

async function sendReminder(invoiceId: string) {
  const confirmed = confirm(`Send reminder email for Invoice #${invoiceId}?`);
  if (!confirmed) return;
  try {
    await fetch('/api/email/reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId })
    });
    alert('Reminder email sent');
  } catch (err) {
    alert('Failed to send reminder');
  }
}

