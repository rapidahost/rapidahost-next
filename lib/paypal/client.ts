// lib/paypal/client.ts
function getApiBase() {
  if (process.env.PAYPAL_API_BASE) return process.env.PAYPAL_API_BASE;
  if (process.env.PAYPAL_MODE?.toLowerCase() === 'sandbox') return 'https://api-m.sandbox.paypal.com';
  return 'https://api-m.paypal.com';
}

export async function getPayPalAccessToken(): Promise<string> {
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
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text().catch(()=> '');
    throw new Error(`PayPal token request failed: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return json.access_token as string;
}

export { getApiBase };

