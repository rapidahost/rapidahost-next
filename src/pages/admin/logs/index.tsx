import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface LogItem {
  id: string
  trace_id: string
  status: string
  message: string
  created_at: string
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([])

  useEffect(() => {
    fetch('/api/logs')
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(err => console.error('❌ Error fetching logs:', err))
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Logs Dashboard</h1>
      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Trace ID</th>
            <th>Status</th>
            <th>Message</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>
                <Link href={`/admin/logs/${log.trace_id}`}>{log.trace_id}</Link>
              </td>
              <td>{log.status}</td>
              <td>{log.message}</td>
              <td>{new Date(log.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
