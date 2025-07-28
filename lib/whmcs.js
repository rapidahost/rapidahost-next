// lib/whmcs.js
export async function createWhmcsClient({ email, plan_id, description }) {
  const res = await fetch(process.env.WHMCS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier: process.env.WHMCS_API_IDENTIFIER,
      secret: process.env.WHMCS_API_SECRET,
      action: 'AddClient',
      firstname: 'Rapidahost',
      lastname: 'Customer',
      email,
      password2: 'Temp123!', // หรือ random ก็ได้
      country: 'TH',
      customfields: [
        {
          id: '1',
          value: plan_id,
        },
      ],
    }),
  });

  const result = await res.json();
  if (result.result !== 'success') {
    throw new Error(result.message || 'WHMCS Error');
  }
  return result;
}
