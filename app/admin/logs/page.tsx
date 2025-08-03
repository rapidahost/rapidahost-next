'use client';

import { useEffect, useState } from 'react';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/logs')
      .then(res => res.json())
      .then(data => {
        setLogs(data?.data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-xl font-bold mb-4">📊 System Logs Dashboard</h1>
      {loading ? <p>Loading logs...</p> : (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Time</th>
                <th className="p-2">Message</th>
                <th className="p-2">Trace ID</th>
                <th className="p-2">Level</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="p-2">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-2">{log.message}</td>
                  <td className="p-2">{log.context?.traceId || '-'}</td>
                  <td className={`p-2 font-medium ${getLevelColor(log.level)}`}>{log.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getLevelColor(level: string) {
  if (level === 'error') return 'text-red-600';
  if (level === 'warn') return 'text-yellow-600';
  if (level === 'info') return 'text-blue-600';
  return '';
}
