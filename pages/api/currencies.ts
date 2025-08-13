// /pages/api/currencies.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('--- /api/currencies called ---');
  console.log('Request method:', req.method);

  try {
    // ตรวจสอบ ENV
    if (!process.env.WHMCS_API_URL || !process.env.WHMCS_API_IDENTIFIER || !process.env.WHMCS_API_SECRET) {
      console.error('❌ Missing WHMCS environment variables');
      return res.status(500).json({ error: 'Missing WHMCS environment variables' });
    }

    // เรียก WHMCS API
    const response = await axios.post(
      process.env.WHMCS_API_URL!,
      new URLSearchParams({
        identifier: process.env.WHMCS_API_IDENTIFIER!,
        secret: process.env.WHMCS_API_SECRET!,
        action: 'GetCurrencies',
        responsetype: 'json',
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    console.log('✅ WHMCS API response:', response.data);

    if (response.data.result !== 'success') {
      console.error('❌ WHMCS API returned error:', response.data);
      return res.status(500).json({ error: 'WHMCS API error', details: response.data });
    }

    return res.status(200).json(response.data.currencies || []);

  } catch (error: any) {
    console.error('❌ Unexpected error in /api/currencies:', error);
    return res.status(500).json({
      error: error.message || 'Internal Server Error',
      stack: error.stack || null,
      details: error.response?.data || null,
    });
  }
}
