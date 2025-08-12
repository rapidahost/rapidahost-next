// pages/admin/logs.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';

interface LogEntry {
  traceId: string;
  type: string;
  status: 'success' | 'failed';
  timestamp: string;
  messageId: string;
  invoiceId?: string;
  clientId?: string;
  retryCount?: number;
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRetriesOnly, setShowRetriesOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    axios.get('/api/logs')
      .then(res => setLogs(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesRetry = showRetriesOnly ? (log.retryCount ?? 0) > 0 : true;
    const matchesSearch = searchTerm
      ? log.traceId.includes(searchTerm) ||
        log.type.includes(searchTerm) ||
        log.messageId.includes(searchTerm)
      : true;
    const logTime = new Date(log.timestamp).getTime();
    const matchesDate = (!dateRange.start || logTime >= new Date(dateRange.start).getTime()) &&
                        (!dateRange.end || logTime <= new Date(dateRange.end).getTime());
    const matchesType = filterType ? log.type === filterType : true;
    const matchesStatus = filterStatus ? log.status === filterStatus : true;
    return matchesRetry && matchesSearch && matchesDate && matchesType && matchesStatus;
  });

  const sortedLogs = filteredLogs.sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return sortAsc ? aTime - bTime : bTime - aTime;
  });

  const exportCSV = () => {
    const exportLogs = filteredLogs;
    const headers = ['Trace ID', 'Type', 'Status', 'Message ID', 'Retry Count', 'Timestamp'];
    const rows = exportLogs.map(log => [
      log.traceId,
      log.type,
      log.status,
      log.messageId,
      log.retryCount ?? 0,
      new Date(log.timestamp).toLocaleString()
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.map(v => `"${v}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'logs_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueTypes = Array.from(new Set(logs.map(log => log.type)));
  const uniqueStatuses = Array.from(new Set(logs.map(log => log.status)));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Logs Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showRetriesOnly}
            onChange={() => setShowRetriesOnly(!showRetriesOnly)}
          />
          <span>Show Retry Only</span>
        </label>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search logs..."
          className="border px-3 py-2 rounded w-full"
        />

        <div className="flex items-center space-x-2">
          <label>Start:</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="border px-2 py-1 rounded"
          />

          <label>End:</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="border px-2 py-1 rounded"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border px-3 py-2 rounded w-full"
        >
          <option value="">All Types</option>
          {uniqueTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border px-3 py-2 rounded w-full"
        >
          <option value="">All Status</option>
          {uniqueStatuses.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <div className="flex space-x-2">
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sort: {sortAsc ? 'Oldest → Newest' : 'Newest → Oldest'}
          </button>

          <button
            onClick={exportCSV}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading && <p>Loading logs...</p>}
      {!loading && sortedLogs.length === 0 && <p>No logs found.</p>}
      {!loading && sortedLogs.length > 0 && (
        <table className="w-full table-auto border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Trace ID</th>
              <th className="border p-2">Type</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Message</th>
              <th className="border p-2">Invoice</th>
              <th className="border p-2">Client</th>
              <th className="border p-2">Retry</th>
              <th className="border p-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {sortedLogs.map((log, index) => (
              <tr key={index} className="border-t hover:bg-gray-50">
                <td className="border p-2 text-blue-600 underline">
                  <Link href={`/admin/logs?traceId=${log.traceId}`}>{log.traceId}</Link>
                </td>
                <td className="border p-2">{log.type}</td>
                <td className="border p-2">
                  <span className={log.status === 'success' ? 'text-green-600' : 'text-red-500'}>
                    {log.status}
                  </span>
                </td>
                <td className="border p-2">
                  <Link href={`/admin/email/${log.messageId}`} className="text-blue-500 underline">
                    {log.messageId}
                  </Link>
                </td>
                <td className="border p-2">
                  {log.invoiceId ? (
                    <Link href={`/admin/invoice/${log.invoiceId}`} className="text-purple-600 underline">
                      {log.invoiceId}
                    </Link>
                  ) : '-'}
                </td>
                <td className="border p-2">
                  {log.clientId ? (
                    <Link href={`/admin/client/${log.clientId}`} className="text-purple-600 underline">
                      {log.clientId}
                    </Link>
                  ) : '-'}
                </td>
                <td className="border p-2 text-center">
                  {(log.retryCount ?? 0) > 0 ? `🔁 ${log.retryCount}` : '0'}
                </td>
                <td className="border p-2">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
