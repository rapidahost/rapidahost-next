import { useEffect, useMemo, useState } from 'react'

type Currency = { id: number; code: string; prefix: string; suffix: string }
type Product = { pid: number; name: string; description?: string }
type Price = { monthly?: number; annually?: number; setup?: number }
type FetchState<T> = { data?: T; loading: boolean; error?: string }

async function safeJson(res: Response) {
  const ct = res.headers.get('content-type') || ''
  const text = await res.text()
  if (!ct.includes('application/json')) {
    console.error('Expected JSON, got:', ct, text.slice(0, 200))
    throw new Error('API returned non-JSON (see logs)')
  }
  try { return JSON.parse(text) } catch {
    throw new Error('Invalid JSON from API')
  }
}

export default function BillingPage() {
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname]   = useState('')
  const [email, setEmail]         = useState('')
  const [promocode, setPromocode] = useState('')
  const [planId, setPlanId]       = useState<number | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly'|'annually'>('monthly')
  const [currencyId, setCurrencyId] = useState<number | null>(null)
  const [currencyList, setCurrencyList] = useState<FetchState<Currency[]>>({ loading: true })
  const [productList, setProductList]   = useState<FetchState<Product[]>>({ loading: false })
  const [price, setPrice] = useState<FetchState<Price>>({ loading: false })
  const [traceId] = useState(() => `RPD-${Math.random().toString(36).slice(2).toUpperCase()}${Date.now().toString(36).toUpperCase()}`)

  // อ่านค่า query + ซ่อน password จาก URL (เก็บไว้ใน sessionStorage)
  useEffect(() => {
    const url = new URL(window.location.href)
    const q = url.searchParams
    const e = q.get('email');     if (e) setEmail(e)
    const fn = q.get('firstname');if (fn) setFirstname(fn)
    const ln = q.get('lastname'); if (ln) setLastname(ln)
    const pwd = q.get('password')
    if (pwd) {
      sessionStorage.setItem('signup_password', pwd)
      q.delete('password')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // โหลด currencies จาก API (relative path → ชัวร์ว่าโดเมนเดียวกัน)
  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        setCurrencyList({ loading: true })
        const res = await fetch('/api/currencies', { method: 'GET' })
        const json = await safeJson(res)
        // json: { currencies: Currency[] } หรือ array ตรงๆ แล้วแต่ API ของคุณ
        const list: Currency[] = Array.isArray(json) ? json : (json.currencies ?? [])
        if (!cancel) {
          setCurrencyList({ loading: false, data: list })
          if (!currencyId && list.length) setCurrencyId(list[0].id)
        }
      } catch (e: any) {
        if (!cancel) setCurrencyList({ loading: false, error: e.message || 'load currencies failed' })
      }
    })()
    return () => { cancel = true }
  }, []) // โหลดครั้งแรก

  // เมื่อ currency เปลี่ยน → โหลด products
  useEffect(() => {
    if (!currencyId) return
    let cancel = false
    ;(async () => {
      try {
        setProductList({ loading: true })
        const res = await fetch(`/api/products?currency_id=${currencyId}`)
        const json = await safeJson(res)
        const items: Product[] = Array.isArray(json) ? json : (json.products ?? [])
        if (!cancel) {
          setProductList({ loading: false, data: items })
          if (!planId && items.length) setPlanId(items[0].pid)
        }
      } catch (e: any) {
        if (!cancel) setProductList({ loading: false, error: e.message || 'load products failed' })
      }
    })()
    return () => { cancel = true }
  }, [currencyId])

  // เมื่อเลือกแผน/รอบบิล → โหลดราคา
  useEffect(() => {
    if (!planId || !currencyId) return
    let cancel = false
    ;(async () => {
      try {
        setPrice({ loading: true })
        const res = await fetch(`/api/product/price?pid=${planId}&currency_id=${currencyId}`)
        const json = await safeJson(res)
        const p: Price = Array.isArray(json) ? json[0] : (json.price ?? json)
        if (!cancel) setPrice({ loading: false, data: p })
      } catch (e: any) {
        if (!cancel) setPrice({ loading: false, error: e.message || 'load price failed' })
      }
    })()
    return () => { cancel = true }
  }, [planId, currencyId])

  const currencyCode = useMemo(
    () => currencyList.data?.find(c => c.id === currencyId)?.code || 'USD',
    [currencyList.data, currencyId]
  )

  const amountCents = useMemo(() => {
    const v = billingCycle === 'annually'
      ? price.data?.annually
      : price.data?.monthly
    if (typeof v !== 'number') return undefined
    // สมมติ API ของคุณส่งหน่วยเป็น “จำนวนเงิน” ไม่ใช่เซนต์ → แปลงเป็นเซนต์
    return Math.round(v * 100)
  }, [price.data, billingCycle])

  async function payWithStripe() {
    if (!amountCents) return alert('ยังไม่มีราคา')
    const resp = await fetch('/api/checkout/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        traceId, plan_id: planId, billing_cycle: billingCycle,
        email, firstname, lastname, promocode,
        amount_cents: amountCents,
        item_name: productList.data?.find(x => x.pid === planId)?.name,
        currency_code: currencyCode,
      })
    })
    const json = await safeJson(resp)
    if (!resp.ok) return alert(json?.error || 'stripe error')
    window.location.href = json.url
  }

  return (
    <div style={{ padding: 24, maxWidth: 840, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Rapidahost</h2>
        <div style={{ marginLeft: 16 }}>
          <label>สกุลเงิน&nbsp;</label>
          {currencyList.loading ? 'Loading…' : (
            <select value={currencyId ?? ''} onChange={e => setCurrencyId(Number(e.target.value))}>
              {(currencyList.data ?? []).map(c => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <h1>Billing</h1>
      {currencyList.error && <div style={{color:'crimson'}}>โหลดสกุลเงินไม่สำเร็จ: {currencyList.error}</div>}
      {productList.error && <div style={{color:'crimson'}}>โหลดแผนไม่สำเร็จ: {productList.error}</div>}
      {price.error && <div style={{color:'crimson'}}>โหลดราคารายแผนไม่สำเร็จ: {price.error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center', maxWidth: 640 }}>
        <label>First name<input value={firstname} onChange={e=>setFirstname(e.target.value)} /></label>
        <label>Last name<input value={lastname} onChange={e=>setLastname(e.target.value)} /></label>
        <label style={{ gridColumn: '1 / span 2' }}>Email<input value={email} onChange={e=>setEmail(e.target.value)} style={{ width:'100%' }} /></label>

        <label>Plan
          <select value={planId ?? ''} onChange={e => setPlanId(Number(e.target.value))}>
            {productList.loading && <option>Loading…</option>}
            {(productList.data ?? []).map(p => <option key={p.pid} value={p.pid}>{p.name}</option>)}
          </select>
        </label>

        <label>Billing cycle
          <select value={billingCycle} onChange={e => setBillingCycle(e.target.value as any)}>
            <option value="monthly">Monthly</option>
            <option value="annually">Annually</option>
          </select>
        </label>

        <label style={{ gridColumn: '1 / span 2' }}>
          Promo code (optional)
          <input value={promocode} onChange={e=>setPromocode(e.target.value)} />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={payWithStripe} disabled={!amountCents || !planId}>Pay with Stripe</button>
        {/* ปุ่ม PayPal ของคุณสามารถวางตรงนี้ */}
      </div>

      <p style={{ opacity: .7 }}>Trace ID: {traceId}</p>

      <h2>Order Summary</h2>
      <div>ราคาสดจาก WHMCS • {currencyCode}</div>
      <div style={{ whiteSpace:'pre-line', opacity:.8, marginTop:8 }}>
        {billingCycle}{'\n'}
        Subtotal: {typeof price.data?.[billingCycle] === 'number' ? price.data?.[billingCycle] : '--'}{'\n'}
        Discount: --{'\n'}
        Total due today: {typeof amountCents === 'number' ? (amountCents/100).toFixed(2) : '--'}
      </div>
    </div>
  )
}

