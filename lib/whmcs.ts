export async function callWhmcs(params: Record<string, any>) {
  if (!process.env.WHMCS_API_URL) throw new Error('WHMCS_API_URL missing')
  const body = new URLSearchParams({
    identifier: process.env.WHMCS_API_IDENTIFIER || '',
    secret:     process.env.WHMCS_API_SECRET || '',
    responsetype: 'json',
    ...Object.fromEntries(Object.entries(params).map(([k,v]) => [k, String(v)])),
  })
  const resp = await fetch(process.env.WHMCS_API_URL, {
    method:'POST',
    headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
    body
  })
  const ct = resp.headers.get('content-type') || ''
  const text = await resp.text()
  if (!resp.ok) throw new Error(`WHMCS ${resp.status}: ${text.slice(0,200)}`)
  if (!ct.includes('application/json')) throw new Error(`WHMCS non-JSON: ${text.slice(0,200)}`)
  const json = JSON.parse(text)
  if (json?.result && json.result !== 'success') throw new Error(`WHMCS error: ${json.message || json.result}`)
  return json
}
