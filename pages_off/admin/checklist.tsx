// pages/admin/checklist.tsx
import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'

type Item = { id: string; code: string; title: string; section: string; sort_order: number }
type Status = { checked: boolean; assignee?: string | null; note?: string | null; updated_at?: string }
type StatusMap = Record<string, Status>

const ADMIN_KEY_HEADER = 'x-admin-key' // ใช้กับ fetch ทุกครั้ง

export default function AdminChecklistPage() {
  const [adminKey, setAdminKey] = useState<string>('')
  const [runKey, setRunKey] = useState<string>('')
  const [runId, setRunId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [statusMap, setStatusMap] = useState<StatusMap>({})
  const [search, setSearch] = useState('')

  const sections = useMemo(() => {
    const groups: Record<string, Item[]> = {}
    items.forEach((it) => {
      if (!groups[it.section]) groups[it.section] = []
      groups[it.section].push(it)
    })
    return groups
  }, [items])

  async function fetchData() {
    if (!adminKey) return
    setLoading(true)
    const qs = runKey ? `?runKey=${encodeURIComponent(runKey)}` : ''
    const res = await fetch(`/api/admin/checklist${qs}`, {
      headers: { [ADMIN_KEY_HEADER]: adminKey },
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json?.error || 'Load failed')
      setLoading(false)
      return
    }
    setRunId(json.runId || null)
    setItems(json.items || [])
    setStatusMap(json.statusMap || {})
    setLoading(false)
  }

  useEffect(() => {
    // โหลดครั้งแรก (ให้ผู้ใช้ใส่ admin key เอง)
  }, [])

  async function toggleItem(itemCode: string, checked: boolean) {
    if (!runId) return alert('Please create new run first')
    const assignee = statusMap[itemCode]?.assignee || ''
    const note = statusMap[itemCode]?.note || ''
    const res = await fetch('/api/admin/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [ADMIN_KEY_HEADER]: adminKey },
      body: JSON.stringify({ runId, itemCode, checked, assignee, note }),
    })
    const json = await res.json()
    if (!res.ok) return alert(json?.error || 'Update failed')
    setStatusMap((prev) => ({ ...prev, [itemCode]: { ...(prev[itemCode] || {}), checked } }))
  }

  async function updateMeta(itemCode: string, field: 'assignee' | 'note', value: string) {
    if (!runId) return alert('Please create new run first')
    const patch = { ...statusMap[itemCode], [field]: value }
    const res = await fetch('/api/admin/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [ADMIN_KEY_HEADER]: adminKey },
      body: JSON.stringify({ runId, itemCode, checked: !!patch.checked, assignee: patch.assignee, note: patch.note }),
    })
    const json = await res.json()
    if (!res.ok) return alert(json?.error || 'Update failed')
    setStatusMap((prev) => ({ ...prev, [itemCode]: patch }))
  }

  async function createNewRun() {
    if (!adminKey) return alert('Missing admin key')
    const rk = runKey || new Date().toISOString().replace(/[:.]/g, '-')
    const res = await fetch('/api/admin/checklist/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [ADMIN_KEY_HEADER]: adminKey },
      body: JSON.stringify({ runKey: rk, createdBy: 'admin' }),
    })
    const json = await res.json()
    if (!res.ok) return alert(json?.error || 'Reset failed')
    setRunKey(json.run.run_key)
    setRunId(json.run.id)
    // เคลียร์สถานะเดิม
    setStatusMap({})
  }

  function filtered(items: Item[]) {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter((i) => i.title.toLowerCase().includes(q) || i.code.toLowerCase().includes(q))
  }

  function allCheckedInSection(section: string) {
    const list = sections[section] || []
    return list.length > 0 && list.every((it) => statusMap[it.code]?.checked)
  }

  return (
    <>
      <Head><title>Admin Checklist • Rapidahost</title></Head>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-semibold">✅ Production Checklist</h1>

        {/* Top bar */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="flex gap-2 items-center">
            <input
              type="password"
              placeholder="Admin API Key"
              className="border rounded px-3 py-2 w-64"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
            />
            <input
              type="text"
              placeholder="Run key (e.g., 2025-08-08T10-15)"
              className="border rounded px-3 py-2 w-64"
              value={runKey}
              onChange={(e) => setRunKey(e.target.value)}
            />
            <button
              onClick={fetchData}
              className="px-3 py-2 border rounded bg-gray-50 hover:bg-gray-100"
              disabled={!adminKey || loading}
            >
              {loading ? 'Loading…' : 'Load'}
            </button>
            <button
              onClick={createNewRun}
              className="px-3 py-2 border rounded bg-black text-white hover:opacity-90"
              disabled={!adminKey}
            >
              New Run
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Search checklist…"
              className="border rounded px-3 py-2 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {Object.keys(sections).length === 0 && (
            <div className="text-gray-500">No items. Run seed API to insert defaults.</div>
          )}

          {Object.entries(sections).map(([section, list]) => (
            <section key={section} className="border rounded-lg">
              <div className="px-4 py-3 bg-gray-100 flex items-center justify-between rounded-t-lg">
                <h2 className="font-medium">
                  {section}{' '}
                  {allCheckedInSection(section) && <span className="ml-2">✅</span>}
                </h2>
                <div className="text-sm text-gray-600">
                  {list.filter((i) => statusMap[i.code]?.checked).length}/{list.length} done
                </div>
              </div>

              <div className="p-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="p-2 w-12">Done</th>
                      <th className="p-2">Title</th>
                      <th className="p-2">Code</th>
                      <th className="p-2 w-40">Assignee</th>
                      <th className="p-2 w-80">Note</th>
                      <th className="p-2 w-40">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered(list).map((it) => {
                      const st = statusMap[it.code] || {}
                      return (
                        <tr key={it.code} className="border-t">
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={!!st.checked}
                              onChange={(e) => toggleItem(it.code, e.target.checked)}
                              disabled={!adminKey}
                            />
                          </td>
                          <td className="p-2">{it.title}</td>
                          <td className="p-2 text-gray-500">{it.code}</td>
                          <td className="p-2">
                            <input
                              className="border rounded px-2 py-1 w-full"
                              placeholder="name/email"
                              value={st.assignee || ''}
                              onChange={(e) => updateMeta(it.code, 'assignee', e.target.value)}
                              disabled={!adminKey}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              className="border rounded px-2 py-1 w-full"
                              placeholder="note / link / evidence"
                              value={st.note || ''}
                              onChange={(e) => updateMeta(it.code, 'note', e.target.value)}
                              disabled={!adminKey}
                            />
                          </td>
                          <td className="p-2 text-gray-500">
                            {st.updated_at ? new Date(st.updated_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
