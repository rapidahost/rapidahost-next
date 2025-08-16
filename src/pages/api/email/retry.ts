// /pages/api/email/retry.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messageId, reason } = req.body;

  if (!messageId || !reason) {
    return res.status(400).json({ error: 'Missing messageId or reason' });
  }

  try {
    // Fetch email
    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('*')
      .eq('messageId', messageId)
      .single();

    if (emailError || !email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Insert retry queue
    const retryId = uuidv4();
    const { error: retryError } = await supabase.from('retry_queue').insert({
      id: retryId,
      type: 'email',
      messageId,
      reason,
      status: 'queued',
      created_at: new Date().toISOString(),
    });

    if (retryError) {
      return res.status(500).json({ error: 'Failed to enqueue retry' });
    }

    // Log
    await supabase.from('logs').insert({
      trace_id: retryId,
      event: 'email.retry.requested',
      payload: {
        messageId,
        reason,
      },
      status: 'success',
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, retryId });
  } catch (err) {
    console.error('Retry error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

