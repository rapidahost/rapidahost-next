// pages/admin/client/[clientId].tsx
"use client";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const ClientPage = () => {
  const router = useRouter();
  const { clientId } = router.query;

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"emails" | "invoices">("emails");

  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [emailPage, setEmailPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);

  const itemsPerPage = 5;

  useEffect(() => {
    if (!clientId) return;
    const fetchClient = async () => {
      const res = await fetch(`/api/client/${clientId}`);
      const data = await res.json();
      setClient(data);
      setLoading(false);
    };
    fetchClient();
  }, [clientId]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!client) return <div className="p-4 text-red-500">Client not found</div>;

  const isInRange = (timestamp: string) => {
    if (!startDate && !endDate) return true;
    const date = new Date(timestamp);
    return (!startDate || new Date(startDate) <= date) && (!endDate || date <= new Date(endDate));
  };

  const emailLogs = (client.emails || []).filter((email: any) =>
    (!statusFilter || email.status === statusFilter) && isInRange(email.timestamp)
  );
  const paginatedEmails = emailLogs.slice((emailPage - 1) * itemsPerPage, emailPage * itemsPerPage);

  const invoices = client.invoices || [];
  const paginatedInvoices = invoices.slice((invoicePage - 1) * itemsPerPage, invoicePage * itemsPerPage);

  const retryEmail = async (messageId: string) => {
    const reason = prompt("Enter reason for retry:");
    if (!reason) return;
    await fetch("/api/email/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, reason })
    });
    alert("Retry requested");
  };

  const exportEmailZip = async () => {
    const zip = new JSZip();
    const csv = [["Type", "To", "Status", "Timestamp"].join(",")];
    emailLogs.forEach((e: any) => {
      csv.push([e.type, e.to, e.status, new Date(e.timestamp).toLocaleString()].map(v => `"${v}"`).join(","));
      zip.file(`pdf/${e.messageId}.pdf`, `PDF for ${e.to}\nStatus: ${e.status}`);
    });
    zip.file("email_logs.csv", csv.join("\n"));
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "email_logs.zip");
  };

  const resendInvoiceEmail = async (invoiceId: string) => {
    const confirmed = confirm(`Resend invoice #${invoiceId}?`);
    if (!confirmed) return;
    await fetch("/api/email/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "invoice", invoiceId })
    });
    alert("Invoice email resend requested");
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Client: {client.name}</h1>
      <div className="space-x-2">
        <button onClick={() => setTab("emails")} className={`px-3 py-1 rounded ${tab === "emails" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>Emails</button>
        <button onClick={() => setTab("invoices")} className={`px-3 py-1 rounded ${tab === "invoices" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>Invoices</button>
      </div>

      {tab === "emails" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setEmailPage(1); }} className="border px-2 py-1 rounded">
              <option value="">All</option>
              <option value="Sent">Sent</option>
              <option value="Failed">Failed</option>
              <option value="Retried">Retried</option>
            </select>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border px-2 py-1 rounded" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border px-2 py-1 rounded" />
            <button onClick={exportEmailZip} className="border bg-gray-100 px-3 py-1 rounded">Export ZIP</button>
          </div>

          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr><th className="p-2 border">To</th><th className="p-2 border">Status</th><th className="p-2 border">Date</th><th className="p-2 border">Actions</th></tr>
            </thead>
            <tbody>
              {paginatedEmails.map((email: any) => (
                <tr key={email.messageId} className="border-t">
                  <td className="p-2 border">{email.to}</td>
                  <td className="p-2 border">{email.status}</td>
                  <td className="p-2 border">{new Date(email.timestamp).toLocaleString()}</td>
                  <td className="p-2 border space-x-2">
                    <Link href={`/admin/email/${email.messageId}`} className="text-blue-600 underline">View</Link>
                    <button onClick={() => retryEmail(email.messageId)} className="text-orange-600 underline">Retry</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "invoices" && (
        <div className="space-y-2">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr><th className="p-2 border">Invoice ID</th><th className="p-2 border">Amount</th><th className="p-2 border">Status</th><th className="p-2 border">Date</th><th className="p-2 border">Actions</th></tr>
            </thead>
            <tbody>
              {paginatedInvoices.map((inv: any) => (
                <tr key={inv.id} className="border-t">
                  <td className="p-2 border">{inv.id}</td>
                  <td className="p-2 border">{inv.amount}</td>
                  <td className="p-2 border">{inv.status}</td>
                  <td className="p-2 border">{new Date(inv.date).toLocaleString()}</td>
                  <td className="p-2 border">
                    <button onClick={() => resendInvoiceEmail(inv.id)} className="text-orange-600 underline">Resend</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClientPage;

