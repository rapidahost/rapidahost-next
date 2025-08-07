import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { useRouter } from 'next/router';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LogEntry {
  id: string;
  trace_id: string;
  status: string;
  message: string;
  created_at: string;
  stripe_checkout_id?: string;
  whmcs_invoice_id?: string;
  email_log_id?: string;
}

export default function LogTable() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filtered, setFiltered] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const router = useRouter();

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('realtime-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'logs' },
        payload => {
          setLogs(prev => [payload.new as LogEntry, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const result = logs.filter(log =>
      log.trace_id.includes(search) &&
      (status ? log.status === status : true)
    );
    setFiltered(result);
    setCurrentPage(1);
  }, [logs, search, status]);

  const fetchLogs = async () => {
    const res = await fetch('/api/logs');
    const data = await res.json();
    setLogs(data);
  };

  const exportCSV = () => {
    const header = 'Trace ID,Status,Message,Time\n';
    const rows = filtered.map(log => `${log.trace_id},${log.status},${log.message},${format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logs.csv';
    a.click();
  };

  const retryLatest = async () => {
    const latest = logs[0];
    if (!latest) return;
    await fetch('/api/retry/process', {
      method: 'POST',
      body: JSON.stringify({ trace_id: latest.trace_id }),
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Logs Dashboard</h1>
      <div className="flex gap-2 mb-4">
        <input
          placeholder="Search traceId..."
          className="border px-2 py-1"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input
          placeholder="Filter status (e.g. failed/success)"
          className="border px-2 py-1"
          value={status}
          onChange={e => setStatus(e.target.value)}
        />
        <button onClick={exportCSV} className="border px-4 py-1">Export CSV</button>
        <button onClick={fetchLogs} className="border px-4 py-1">Refresh</button>
        <button onClick={retryLatest} className="border px-4 py-1">Retry Latest</button>
      </div>

      <table className="w-full text-sm border">
        <thead>
          <tr>
            <th>Trace ID</th>
            <th>Status</th>
            <th>Message</th>
            <th>Time</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map(log => (
            <tr key={log.id}>
              <td>
                <a href={`/admin/logs?trace_id=${log.trace_id}`} className="text-blue-600 underline">
                  {log.trace_id}
                </a>
              </td>
              <td>{log.status}</td>
              <td>{log.message}</td>
              <td>{format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}</td>
              <td>
                {log.stripe_checkout_id && (
                  <a href={`https://dashboard.stripe.com/payments/${log.stripe_checkout_id}`} target="_blank" className="text-blue-500">Stripe</a>
                )}
                {log.whmcs_invoice_id && (
                  <a href={`https://billing.rapidahost.com/admin/invoices.php?action=edit&id=${log.whmcs_invoice_id}`} target="_blank" className="text-green-500 ml-2">WHMCS</a>
                )}
                {log.email_log_id && (
                  <a href={`https://app.sendgrid.com/email_activity?filters=${log.email_log_id}`} target="_blank" className="text-gray-700 ml-2">Email</a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex gap-2">
        {Array.from({ length: Math.ceil(filtered.length / pageSize) }).map((_, i) => (
          <button
            key={i}
            className={`border px-2 ${currentPage === i + 1 ? 'bg-black text-white' : ''}`}
            onClick={() => setCurrentPage(i + 1)}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
