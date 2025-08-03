// pages/api/logs.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getLogsFromStorage } from '@/lib/log-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const logs = await getLogsFromStorage();

    // Group by traceId to calculate retryCount
    const retryCountMap: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.type === 'email.retry') {
        retryCountMap[log.messageId] = (retryCountMap[log.messageId] || 0) + 1;
      }
    });

    const logsWithRetry = logs.map((log) => ({
      ...log,
      retryCount: retryCountMap[log.messageId] || 0,
    }));

    return res.status(200).json(logsWithRetry);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
}
