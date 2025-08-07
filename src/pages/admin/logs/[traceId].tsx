// src/pages/admin/logs/[traceId].tsx
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'

export default function LogDetailPage() {
  const router = useRouter()
  const { traceId } = router.query

  const [log, setLog] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!traceId) return
    const fetchLog = async () => {
      try {
        const res = await axios.get(`/api/logs/${traceId}`)
        setLog(res.data)
      } catch (err) {
        console.error('Failed to fetch log', err)
      } finally {
        setLoading(false)
      }
    }
    fetchLog()
  }, [traceId])

  if (loading) return <div className="p-4">Loading...</div>
  if (!log) return <div className="p-4 text-red-500">Log not found</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Log Detail</h1>
        <Link href="/admin/logs" className="text-sm text-blue-600 underline">
          ← Back to Logs
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(log, null, 2)}</pre>
      </div>

      {log.status === 'Failed' && (
        <form method="POST" action={`/api/retry/process`}>
          <input type="hidden" name="traceId" value={log.trace_id} />
          <button
            type="submit"
            className="bg-red-600 text-white rounded px-4 py-2 text-sm hover:bg-red-700"
          >
            Retry ล่าสุด
          </button>
        </form>
      )}
    </div>
  )
}
