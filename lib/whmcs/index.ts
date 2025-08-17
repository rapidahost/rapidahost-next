export async function whmcsGetClientByEmail(email: string): Promise<{
  result: string;
  clients?: { client: Array<{ id: string }> };
}> {
  const { data } = await axios.post(WHMCS_API_URL, null, {
    params: {
      action: 'GetClientsDetails',
      identifier: WHMCS_IDENTIFIER,
      secret: WHMCS_SECRET,
      email,
      stats: false,
      responsetype: 'json',
    },
  });

  // ทำให้มี shape ตรงกับ simulate.ts: existing.clients.client[0].id
  const result = data?.result ?? 'error';
  const clients =
    result === 'success' && data?.userid
      ? { client: [{ id: String(data.userid) }] }
      : { client: [] };

  return { result, clients };
}
