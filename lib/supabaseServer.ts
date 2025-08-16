// /lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';

export const supabaseServer = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'rapidahost-logger/1.0' } },
  }
);
