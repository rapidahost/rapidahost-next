// lib/paypal/verifySignature.ts

type AnyHeaders = Record<string, string | string[] | undefined>;

function getApiBase() {
  // เลือก API base อัตโนมัติ: PAYPAL_API_BASE > PAYPAL_MODE > default live
  if (process.env.PAYPAL_API_BASE) return process.env.PAYPAL_API_BASE;
  if (process.env.PAYPAL_MODE?.toLowerCase() === 'sandbox') return 'https://api-m.sandbox.paypal.com';
  return 'https://api-m.paypal.com';
}

function envReadyForRealVerify() {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_SECRET &&
    process.env.PAYPAL_WEBHOOK_ID &&
    !process.env.PAYPAL_VERIFY_DISABLED // set = '1' เพื่อบังคับ Stub แม้มี ENV ครบ
  );
}

function h(headers: AnyHeaders, key: string): string {
  const v = headers[key.toLowerCase()];
  return Array.isArray(v) ? v[0] ?? '' : (v ?? '') as string;
}

/**
 * สลับโหมดอัตโนมัติ:
 * - โหมดจริง: Production และ ENV ครบ → เรียก PayPal Verify API
 * - โหมด Stub: อย่างอื่นทั้งหมด → คืน true เพื่อไม่ขวาง flow ตอน dev/preview
 */
export async function verifyPayPalSignature(headers: AnyHeaders, webhookEvent: any): Promise<boolean> {
  if (!envReadyForRealVerify()) {
    // STUB MODE
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[PayPal] Stub verification enabled (missing env or disabled)');
    }
    return true;
  }

  // REAL MODE
  try {
    const transmissionId  = h(headers, 'paypal-transmission-id');
    const transmissionTime= h(headers, 'paypal-transmission-time');
    const certUrl         = h(headers, 'paypal-cert-url');
    const authAlgo        = h(headers, 'paypal-auth-algo');
    const transmissionSig = h(headers, 'paypal-transmission-sig');
    const webhookId       = process.env.PAYPAL_WEBHOOK_ID!;

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      console.error('[PayPal] Missing required webhook headers');
      return false;
    }

    const token = await getPayPalAccessToken();
    const res = await fetch(`${getApiBase()}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('[PayPal] Verify API failed', res.status, txt);
      return false;
    }

    const json: any = await res.json();
    return json?.verification_status === 'SUCCESS';
  } catch (err) {
    console.error('[PayPal] verifyPayPalSignature error', err);
    return false;
  }
}

async function getPayPalAccessToken(): Promise<string> {
  const cid = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const creds = Buffer.from(`${cid}:${secret}`).toString('base64');

  const res = await fetch(`${getApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`PayPal token request failed: ${res.status} ${txt}`);
  }
  const json: any = await res.json();
  return json.access_token as string;
}
