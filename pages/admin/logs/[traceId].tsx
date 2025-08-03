// pages/admin/logs/[traceId].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LogDetailPage() {
  const router = useRouter();
  const { traceId } = router.query;
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!traceId) return;
    fetch(`/api/logs/${traceId}`)
      .then((res) => res.json())
      .then((data) => {
        setLog(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [traceId]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!log) return <div className="p-6 text-red-600">Log not found</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Log Detail: {log.traceId}</h1>

      <div className="space-y-1 text-sm">
        <p><b>Status:</b> <span className={log.status === 'success' ? 'text-green-600' : 'text-red-600'}>{log.status}</span></p>
        <p><b>Type:</b> {log.type}</p>
        <p><b>Timestamp:</b> {new Date(log.timestamp).toLocaleString()}</p>
        <p><b>Client ID:</b> <Link href={`/admin/client/${log.clientId}`} className="text-blue-600 underline">{log.clientId}</Link></p>
        <p><b>Invoice ID:</b> <Link href={`/admin/invoice/${log.invoiceId}`} className="text-blue-600 underline">{log.invoiceId}</Link></p>
        <p><b>Service ID:</b> {log.serviceId}</p>
        <p><b>Retry Count:</b> {log.retryCount}</p>
        {log.error && <p><b>Error:</b> <span className="text-red-700">{log.error}</span></p>}
        <p><b>Message:</b> {log.message || '-'}</p>
      </div>

      {log.status !== 'success' && (
        <button
          className="mt-4 px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded"
          onClick={async () => {
            const reason = prompt('Enter reason to retry:');
            if (!reason) return;
            await fetch('/api/logs/retry', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ traceId, reason })
            });
            alert('Retry queued');
          }}
        >
          Retry This Log
        </button>
      )}
    </div>
  );
}
