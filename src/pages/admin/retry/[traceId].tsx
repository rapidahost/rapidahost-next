import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function RetryTraceIdPage() {
  const router = useRouter()
  const { traceId } = router.query

  const [result, setResult] = useState<null | {
    status: 'success' | 'failed'
    message: string
    logs?: any
  }>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!traceId || typeof traceId !== 'string') return

    const retry = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/retry/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ traceId })
        })
        const json = await res.json()
        setResult(json)
      } catch (err) {
        setResult({ status: 'failed', message: 'Unexpected error' })
      } finally {
        setLoading(false)
      }
    }

    retry()
  }, [traceId])

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-xl font-semibold mb-4">Retry Process</h1>
      {loading && <p>Retrying with Trace ID: {traceId}...</p>}
      {result && (
        <div className={`border rounded p-4 mt-4 ${result.status === 'success' ? 'border-green-500' : 'border-red-500'}`}>
          <p className="font-semibold">Status: {result.status}</p>
          <p className="text-sm mt-1">Message: {result.message}</p>
          {result.logs && (
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(result.logs, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

