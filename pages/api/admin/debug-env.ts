// pages/api/admin/debug-env.ts
import type { NextApiRequest, NextApiResponse } from 'next';
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const v = process.env.ADMIN_API_KEY || '';
  res.status(200).json({ hasValue: !!v, length: v.length, head: v ? v.slice(0, 6) : null });
}

