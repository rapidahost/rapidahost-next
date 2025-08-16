// ✅ /pages/api/client/[clientId].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { clientId } = req.query;
  if (!clientId || typeof clientId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid clientId' });
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const { data: emails } = await supabase
    .from('emails')
    .select('*')
    .eq('client_id', clientId)
    .order('timestamp', { ascending: false });

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false });

  return res.status(200).json({ client, emails, invoices });
}

