// /lib/env.ts
export const ENV = {
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ADMIN_API_KEY: process.env.ADMIN_API_KEY!,
  WHMCS_URL: process.env.WHMCS_URL!,
  WHMCS_IDENTIFIER: process.env.WHMCS_IDENTIFIER!,
  WHMCS_SECRET: process.env.WHMCS_SECRET!,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY!,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '', // e.g. https://rapidahost.com
};

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_SERVICE_ROLE_KEY) {
  // แนะนำให้ log แค่ server
  console.warn('[env] Missing Supabase server envs');
}
