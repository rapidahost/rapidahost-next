// pages/api/currencies.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const adminKey = req.headers['x-admin-key'] || ''
    if (adminKey !== (process.env.ADMIN_API_KEY || '')) {
      return res.status(403).json({ ok: false, error: 'Forbidden' })
    }

    const url = `${process.env.WHMCS_API_URL}?identifier=${process.env.WHMCS_API_IDENTIFIER}&secret=${process.env.WHMCS_API_SECRET}&accesskey=${process.env.WHMCS_API_ACCESS_KEY}&action=GetCurrencies&responsetype=json`

    const { data } = await axios.get(url)

    res.status(200).json({
      ok: true,
      debug: {
        WHMCS_API_URL: process.env.WHMCS_API_URL,
        WHMCS_API_IDENTIFIER: process.env.WHMCS_API_IDENTIFIER,
        WHMCS_API_SECRET: process.env.WHMCS_API_SECRET?.slice(0, 4) + '***',
        WHMCS_API_ACCESS_KEY: process.env.WHMCS_API_ACCESS_KEY?.slice(0, 4) + '***',
      },
      currencies: data,
    })
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message || 'Unknown error',
      stack: error.stack,
    })
  }
}
