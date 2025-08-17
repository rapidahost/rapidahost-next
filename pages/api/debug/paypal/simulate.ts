// pages/api/debug/paypal/simulate.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { insertLog } from '@/lib/logs'
import { whmcsGetClientByEmail, whmcsCreateClient } from '@/lib/whmcs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // simple auth สำหรับ debug endpoint
  if (req.headers['x-admin-key'] !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const traceId = (req.query.traceId as string) ?? `debug-${Date.now()}`
  const email = (req.body?.email as string) ?? 'debug@example.com'
  const name = (req.body?.name as string) ?? 'Debug User'

  const [firstname, ...rest] = name.split(' ')
  const lastname = rest.join(' ') || 'User'

  try {
    let clientId: number

    // ลองค้นหาจาก WHMCS ก่อน
    const existing = await whmcsGetClientByEmail(email)
    if (existing?.result === 'success' && (existing as any).clients?.client?.length) {
      const first = (existing as any).clients.client[0] as { id: string | number }
      clientId = typeof first.id === 'string' ? parseInt(first.id, 10) : Number(first.id)
    } else {
      // ไม่พบ -> สร้าง client ใหม่
      const created = await whmcsCreateClient({ firstname, lastname, email })
      if (created?.result !== 'success') {
        return res.status(500).json({
          error: 'WHMCS AddClient failed',
          detail: created,
        })
      }
      clientId = Number((created as any).clientid)
    }

    await insertLog({
      traceId,
      source: 'whmcs',
      step: 'simulate_paypal',
      status: 'success',
      data: { clientId, email },
    } as any)

    return res.status(200).json({ ok: true, clientId })
  } catch (err: any) {
    await insertLog({
      traceId,
      source: 'simulate',
      step: 'error',
      status: 'failed',
      data: { message: err?.message },
    } as any)
    return res.status(500).json({ ok: false, error: err?.message ?? 'unknown' })
  }
}
