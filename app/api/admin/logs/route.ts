// /app/api/admin/logs/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const res = await axios.get('https://api.logtail.com/logs', {
      headers: {
        Authorization: `Bearer ${process.env.LOGTAIL_API_KEY!}`,
      },
      params: {
        query: 'traceId OR stripe OR whmcs OR retry OR sendgrid',
        limit: 100,
      },
    });

    return NextResponse.json(res.data);
  } catch (err: any) {
    console.error('❌ Failed to fetch logs:', err.message);
    return NextResponse.json({ error: 'Logtail fetch failed' }, { status: 500 });
  }
}
