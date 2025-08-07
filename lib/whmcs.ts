// lib/whmcs.ts
import qs from 'qs'

const WHMCS_API_URL = process.env.WHMCS_API_URL! // เช่น https://billing.rapidahost.com/api/index.php
const WHMCS_IDENTIFIER = process.env.WHMCS_API_IDENTIFIER!
const WHMCS_SECRET = process.env.WHMCS_API_SECRET!
const WHMCS_ADMIN_USER = process.env.WHMCS_API_ADMIN_USER!

async function callWhmcsApi<T>(action: string, extraParams: Record<string, any>): Promise<T> {
  const postData = qs.stringify({
    identifier: WHMCS_IDENTIFIER,
    secret: WHMCS_SECRET,
    action,
    adminuser: WHMCS_ADMIN_USER,
    responsetype: 'json',
    ...extraParams,
  })

  const response = await fetch(WHMCS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: postData,
  })

  const result = await response.json()
  if (result.result !== 'success') {
    console.error(`[WHMCS] ${action} failed`, result)
    throw new Error(result.message || 'WHMCS API call failed')
  }

  return result
}

// ✅ ดึงข้อมูล Client
export async function getClient(clientId: string) {
  const result = await callWhmcsApi<{ client: any }>('GetClientsDetails', { clientid: clientId })
  return result.client
}

// ✅ ดึงข้อมูล Invoice
export async function getInvoice(invoiceId: string) {
  const result = await callWhmcsApi<{ invoice: any }>('GetInvoice', { invoiceid: invoiceId })
  return result.invoice
}

// ✅ ดึงข้อมูล Service
export async function getService(serviceId: string) {
  const result = await callWhmcsApi<{ product: any }>('GetClientsProducts', {
    serviceid: serviceId,
  })

  // WHMCS คืนเป็น array ถึงแม้มีแค่รายการเดียว
  return result.product
}
