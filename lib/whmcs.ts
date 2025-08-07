import axios from 'axios'

const WHMCS_API_URL = process.env.WHMCS_API_URL!
const WHMCS_IDENTIFIER = process.env.WHMCS_API_IDENTIFIER!
const WHMCS_SECRET = process.env.WHMCS_API_SECRET!

export async function getClientDetails(clientId: number) {
  try {
    const payload = {
      identifier: WHMCS_IDENTIFIER,
      secret: WHMCS_SECRET,
      action: 'GetClientsDetails',
      clientid: clientId,
      stats: true,
      responsetype: 'json',
    }

    const { data } = await axios.post(WHMCS_API_URL, payload)

    if (data.result !== 'success') {
      throw new Error(`WHMCS error: ${data.message || 'Unknown error'}`)
    }

    return data
  } catch (error: any) {
    console.error('Error in getClientDetails:', error.response?.data || error.message)
    throw error
  }
}

export async function getClientServices(clientId: number) {
  try {
    const payload = {
      identifier: WHMCS_IDENTIFIER,
      secret: WHMCS_SECRET,
      action: 'GetClientsProducts',
      clientid: clientId,
      responsetype: 'json',
    }

    const { data } = await axios.post(WHMCS_API_URL, payload)

    if (data.result !== 'success') {
      throw new Error(`WHMCS error: ${data.message || 'Unknown error'}`)
    }

    return data
  } catch (error: any) {
    console.error('Error in getClientServices:', error.response?.data || error.message)
    throw error
  }
}

export async function getInvoiceDetails(invoiceId: number) {
  try {
    const payload = {
      identifier: WHMCS_IDENTIFIER,
      secret: WHMCS_SECRET,
      action: 'GetInvoice',
      invoiceid: invoiceId,
      responsetype: 'json',
    }

    const { data } = await axios.post(WHMCS_API_URL, payload)

    if (data.result !== 'success') {
      throw new Error(`WHMCS error: ${data.message || 'Unknown error'}`)
    }

    return data
  } catch (error: any) {
    console.error('Error in getInvoiceDetails:', error.response?.data || error.message)
    throw error
  }
}
