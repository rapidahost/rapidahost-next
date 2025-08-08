// pages/admin/client/[clientId].tsx
import { useCallback, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { GetServerSideProps } from 'next'
import { getClient } from '@/lib/whmcs'

// -------- Types --------
type EmailLog = {
  messageId: string
  type: string
  to: string
  status: 'Sent' | 'Failed' | 'Opened' | 'Clicked' | 'Retried' | string
  timestamp: string
}

type InvoiceLite = {
  id: string
  amount: string
  status: string
  date: string
}

type ServiceLite = {
  id: string
  name: string
  domain?: string
  status: string
}

type ClientData = {
  id: number | string
  firstname: string
  lastname: string
  email: string
  services?: ServiceLite[]
  invoices?: InvoiceLite[]
  emails?: EmailLog[]
}

// -------- Page --------
type Props = { client: ClientData }

export default function AdminClientPage({ client }: Props) {
  const router = useRouter()

  // --- Tabs ---
  const tabQuery = (router.query.tab as string) || 'services'
  const [activeTab, setActiveTab] = useState<'services' | 'emails' | 'invoices'>(
    tabQuery === 'emails' ? 'emails' : tabQuery === 'invoices' ? 'invoices' : 'services',
  )
  const setTab = (t: 'services' | 'emails' | 'invoices') => {
    setActiveTab(t)
    const q = new URLSearchParams(router.query as any)
    q.set('tab', t)
    router.replace({ pathname: router.pathname, query: { ...router.query, tab: t } }, undefined, { shallow: true })
  }

  // --- Shared pagination ---
  const ITEMS_PER_PAGE = 5

  // =================== Emails Tab ===================
  const [emailPage, setEmailPage] = useState(1)
  const [emailStatus, setEmailStatus] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])

  const isInRange = useCallback((ts: string) => {
    if (!startDate && !endDate) return true
    const d = new Date(ts)
    return (!startDate || new Date(startDate) <= d) && (!endDate || d <= new Date(endDate))
  }, [startDate, endDate])

  const emailLogs = useMemo<EmailLog[]>(() => {
    const list = (client.emails || [])
    return list.filter(e => (!emailStatus || e.status === emailStatus) && isInRange(e.timestamp))
  }, [client.emails, emailStatus, isInRange])

  const paginatedEmails = useMemo(
    () => emailLogs.slice((emailPage - 1) * ITEMS_PER_PAGE, emailPage * ITEMS_PER_PAGE),
    [emailLogs, emailPage],
  )

  const exportEmailCSV = useCallback(() => {
    const rows = [['Type', 'To', 'Status', 'Timestamp']]
    emailLogs.forEach(e => rows.push([e.type, e.to, e.status, new Date(e.timestamp).toLocaleString()]))
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    saveAs(blob, 'email_logs.csv')
  }, [emailLogs])

  const exportEmailZIP = useCallback(async () => {
    const zip = new JSZip()
    // CSV
    const rows = [['Type', 'To', 'Status', 'Timestamp']]
    emailLogs.forEach(e => rows.push([e.type, e.to, e.status, new Date(e.timestamp).toLocaleString()]))
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    zip.file('email_logs.csv', csv)
    // Dummy PDFs per message (placeholder)
    emailLogs.forEach(e => {
      zip.file(`pdf/${e.messageId}.pdf`, `Email to: ${e.to}\nStatus: ${e.status}\nSent: ${e.timestamp}`)
    })
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, 'email_logs.zip')
  }, [emailLogs])

  const retryEmail = useCallback(async (messageId: string) => {
    const reason = prompt('Enter reason for retry:')
    if (!reason) return
    try {
      await fetch('/api/email/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, reason }),
      })
      alert('Retry requested')
    } catch {
      alert('Retry failed')
    }
  }, [])

  const bulkRetry = useCallback(async () => {
    const reason = prompt('Reason for retry selected emails:')
    if (!reason || selectedEmails.length === 0) return
    try {
      await Promise.all(
        selectedEmails.map(messageId =>
          fetch('/api/email/retry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId, reason }),
          }),
        ),
      )
      alert('Retry sent for selected emails')
    } catch {
      alert('Bulk retry failed')
    }
  }, [selectedEmails])

  // =================== Invoices Tab ===================
  const [invoicePage, setInvoicePage] = useState(1)
  const invoices = (client.invoices || []) as InvoiceLite[]
  const paginatedInvoices = useMemo(
    () => invoices.slice((invoicePage - 1) * ITEMS_PER_PAGE, invoicePage * ITEMS_PER_PAGE),
    [invoices, invoicePage],
  )

  const resendInvoiceEmail = useCallback(async (invoiceId: string) => {
    const confirmed = confirm(`Resend invoice email for Invoice #${invoiceId}?`)
    if (!confirmed) return
    try {
      await fetch('/api/email/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invoice', invoiceId }),
      })
      alert('Invoice email resend requested')
    } catch {
      alert('Failed to resend invoice email')
    }
  }, [])

  // =================== Services Tab ===================
  const services = (client.services || []) as ServiceLite[]

  // -------- Render --------
  return (
    <>
      <Head>
        <title>Client #{client.id} • Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              {client.firstname} {client.lastname}
            </h1>
            <div className="text-sm text-gray-600">{client.email}</div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/clients" className="px-3 py-1 border rounded hover:bg-gray-50">
              ← Back
            </Link>
          </div>
        </header>

        {/* Tabs */}
        <nav className="flex gap-2">
          {(['services', 'emails', 'invoices'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded border ${
                activeTab === t ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'
              }`}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>

        {/* ======= Services ======= */}
        {activeTab === 'services' && (
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Services ({services.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-2 border">ID</th>
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Domain</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id} className="border-t">
                      <td className="p-2 border">{s.id}</td>
                      <td className="p-2 border">{s.name}</td>
                      <td className="p-2 border">{s.domain || '-'}</td>
                      <td className="p-2 border">{s.status}</td>
                      <td className="p-2 border">
                        <Link href={`/admin/service/${s.id}`} className="text-blue-600 underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {services.length === 0 && (
                    <tr>
                      <td className="p-3 text-center text-gray-500" colSpan={5}>
                        No services found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ======= Emails ======= */}
        {activeTab === 'emails' && (
          <section className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-medium">Emails ({emailLogs.length})</h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={emailStatus}
                  onChange={e => {
                    setEmailStatus(e.target.value)
                    setEmailPage(1)
                  }}
                  className="text-sm border px-2 py-1 rounded"
                >
                  <option value="">All Status</option>
                  <option value="Sent">Sent</option>
                  <option value="Failed">Failed</option>
                  <option value="Opened">Opened</option>
                  <option value="Clicked">Clicked</option>
                  <option value="Retried">Retried</option>
                </select>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value)
                    setEmailPage(1)
                  }}
                  className="text-sm border px-2 py-1 rounded"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value)
                    setEmailPage(1)
                  }}
                  className="text-sm border px-2 py-1 rounded"
                />
                <button onClick={exportEmailCSV} className="text-sm bg-gray-100 hover:bg-gray-200 border rounded px-3 py-1">
                  Export CSV
                </button>
                <button onClick={exportEmailZIP} className="text-sm bg-gray-100 hover:bg-gray-200 border rounded px-3 py-1">
                  Export ZIP
                </button>
                <button
                  disabled={selectedEmails.length === 0}
                  onClick={bulkRetry}
                  className="text-sm bg-orange-100 hover:bg-orange-200 border rounded px-3 py-1 disabled:opacity-50"
                >
                  Retry Selected
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-2 border w-10"></th>
                    <th className="p-2 border">Type</th>
                    <th className="p-2 border">To</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmails.map((email, i) => (
                    <tr key={`${email.messageId}-${i}`} className="border-t">
                      <td className="p-2 border text-center">
                        <input
                          type="checkbox"
                          checked={selectedEmails.includes(email.messageId)}
                          onChange={e =>
                            setSelectedEmails(prev =>
                              e.target.checked ? [...prev, email.messageId] : prev.filter(id => id !== email.messageId),
                            )
                          }
                        />
                      </td>
                      <td className="p-2 border">{email.type}</td>
                      <td className="p-2 border">{email.to}</td>
                      <td className="p-2 border">
                        {email.status === 'Retried' ? '🔁 Retried' : email.status}
                      </td>
                      <td className="p-2 border">{new Date(email.timestamp).toLocaleString()}</td>
                      <td className="p-2 border space-x-2">
                        <Link href={`/admin/email/${email.messageId}`} className="text-blue-600 underline">
                          View
                        </Link>
                        <Link href={`/admin/client/${client.id}?tab=invoices`} className="text-gray-600 underline">
                          Invoice
                        </Link>
                        <button onClick={() => retryEmail(email.messageId)} className="text-orange-600 underline">
                          Retry
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedEmails.length === 0 && (
                    <tr>
                      <td className="p-3 text-center text-gray-500" colSpan={6}>
                        No emails found with current filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between text-sm">
              <button
                disabled={emailPage === 1}
                onClick={() => setEmailPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border bg-white disabled:opacity-50"
              >
                ← Prev
              </button>
              <div>
                Page {emailPage} of {Math.max(1, Math.ceil(emailLogs.length / ITEMS_PER_PAGE))}
              </div>
              <button
                disabled={emailPage * ITEMS_PER_PAGE >= emailLogs.length}
                onClick={() => setEmailPage(p => p + 1)}
                className="px-3 py-1 rounded border bg-white disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </section>
        )}

        {/* ======= Invoices ======= */}
        {activeTab === 'invoices' && (
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Invoices ({invoices.length})</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-2 border">Invoice ID</th>
                    <th className="p-2 border">Amount</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map(inv => (
                    <tr key={inv.id} className="border-t">
                      <td className="p-2 border">{inv.id}</td>
                      <td className="p-2 border">{inv.amount}</td>
                      <td className="p-2 border">{inv.status}</td>
                      <td className="p-2 border">{new Date(inv.date).toLocaleString()}</td>
                      <td className="p-2 border space-x-2">
                        <Link href={`/admin/invoice/${inv.id}`} className="text-blue-600 underline">
                          View
                        </Link>
                        <button onClick={() => resendInvoiceEmail(inv.id)} className="text-orange-600 underline">
                          Resend
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedInvoices.length === 0 && (
                    <tr>
                      <td className="p-3 text-center text-gray-500" colSpan={5}>
                        No invoices found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between text-sm">
              <button
                disabled={invoicePage === 1}
                onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border bg-white disabled:opacity-50"
              >
                ← Prev
              </button>
              <div>
                Page {invoicePage} of {Math.max(1, Math.ceil(invoices.length / ITEMS_PER_PAGE))}
              </div>
              <button
                disabled={invoicePage * ITEMS_PER_PAGE >= invoices.length}
                onClick={() => setInvoicePage(p => p + 1)}
                className="px-3 py-1 rounded border bg-white disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  )
}

// --------- server-side data fetch (WHMCS) ----------
export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  try {
    const clientId = String(ctx.params?.clientId || '')
    // คุณอาจปรับให้ดึง services/invoices/emails จากหลาย endpoint แล้ว map เป็นโครงสร้างด้านบน
    const base = await getClient(clientId)

    const client: ClientData = {
      id: base?.client?.id ?? clientId,
      firstname: base?.client?.firstname ?? '-',
      lastname: base?.client?.lastname ?? '',
      email: base?.client?.email ?? '',
      services: base?.products?.product?.map((p: any) => ({
        id: p.id,
        name: p.name || p.productname,
        domain: p.domain,
        status: p.status,
      })) ?? [],
      invoices: base?.invoices?.invoice?.map((inv: any) => ({
        id: String(inv.id),
        amount: inv.total || inv.amount,
        status: inv.status,
        date: inv.date || inv.duedate,
      })) ?? [],
      emails: base?.emails?.map((e: any) => ({
        messageId: e.id || e.messageId,
        type: e.type || 'System',
        to: e.to || base?.client?.email,
        status: e.status || 'Sent',
        timestamp: e.timestamp || e.date || new Date().toISOString(),
      })) ?? [],
    }

    return { props: { client } }
  } catch (err) {
    // ป้องกัน build พัง กรณีดึงข้อมูลไม่ได้
    return {
      props: {
        client: {
          id: 'unknown',
          firstname: 'Unknown',
          lastname: '',
          email: '',
          services: [],
          invoices: [],
          emails: [],
        },
      },
    }
  }
}
