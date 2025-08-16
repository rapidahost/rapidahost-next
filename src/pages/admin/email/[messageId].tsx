// pages/admin/email/[messageId].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface EmailEvent {
  event: string;
  timestamp: number;
  ip: string;
  useragent: string;
}

interface EmailLogDetail {
  subject: string;
  to: string;
  messageId: string;
  headers: Record<string, string>;
  events: EmailEvent[];
  status: 'success' | 'failed';
  service: string;
  invoiceId?: string;
  clientId?: string;
}

export default function EmailLogPage() {
  const router = useRouter();
  const { messageId } = router.query;
  const [email, setEmail] = useState<EmailLogDetail | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<string | null>(null);

  useEffect(() => {
    if (messageId) {
      axios
        .get(`/api/email/${messageId}`)
        .then((res) => setEmail(res.data))
        .catch((err) => console.error(err));
    }
  }, [messageId]);

  const handleRetry = async () => {
    if (!email) return;
    setRetrying(true);
    try {
      const res = await axios.post('/api/email/retry', {
        messageId: email.messageId,
        clientId: email.clientId,
        invoiceId: email.invoiceId,
        service: email.service,
      });
      setRetryResult('✅ Retry success');
    } catch (err: any) {
      setRetryResult('❌ Retry failed');
    } finally {
      setRetrying(false);
    }
  };

  if (!email) return <div>Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Email Log Detail</h1>
      <div>
        <p><strong>Subject:</strong> {email.subject}</p>
        <p><strong>To:</strong> {email.to}</p>
        <p><strong>Message ID:</strong> {email.messageId}</p>
        <p><strong>Status:</strong> {email.status}</p>
        <p><strong>Service:</strong> {email.service}</p>
        <p><strong>Invoice ID:</strong> {email.invoiceId}</p>
        <p><strong>Client ID:</strong> {email.clientId}</p>
      </div>

      <div>
        <h2 className="font-semibold mt-4">Headers</h2>
        <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
          {JSON.stringify(email.headers, null, 2)}
        </pre>
      </div>

      <div>
        <h2 className="font-semibold mt-4">Events</h2>
        <ul className="list-disc pl-5">
          {email.events.map((e, i) => (
            <li key={i}>
              {e.event} at {new Date(e.timestamp * 1000).toLocaleString()} ({e.ip})
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-4">
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {retrying ? 'Retrying...' : 'Retry Email'}
        </button>
        {retryResult && <p className="mt-2 text-sm">{retryResult}</p>}
      </div>

      <div>
        <Link href="/admin/logs" className="text-blue-500 underline">
          ← Back to Logs
        </Link>
      </div>
    </div>
  );
}

