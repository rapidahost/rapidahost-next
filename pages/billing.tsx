import { useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import type { GetServerSideProps } from 'next'
import { countryToCurrency } from '@/lib/geoCurrency'
import { formatMoney } from '@/lib/currency'

type BillingCycle = 'monthly'|'quarterly'|'semiannually'|'annually'
type Product = {
  pid: number; name: string; description: string;
  pricing: { monthly:number|null; quarterly:number|null; semiannually:number|null; annually:number|null; biennially:number|null; triennially:number|null }
}
type Quote = {
  plan:{ pid:number; name:string; billingCycle:string; baseAmount:number }
  coupon:{ valid:boolean; type:string; amount:number; description:string }
  total:{ subtotal:number; discount:number; totalDue:number }
}
type Props = { initialCurrencyId: number | null; initialCurrencyCode: string }

declare global { interface Window { paypal?: any } }

export default function BillingPage({ initialCurrencyId, initialCurrencyCode }: Props) {
  // ผู้ใช้
  const [email, setEmail] = useState('')
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')

  // เงิน/แผนจาก WHMCS
  const [currencies, setCurrencies] = useState<Array<{id:number; code:string}>>([])
  const [currencyId, setCurrencyId] = useState<number>(initialCurrencyId || 1)
  const currencyCode = useMemo(() => currencies.find(c=>c.id===currencyId)?.code || initialCurrencyCode || 'USD', [currencies, currencyId, initialCurrencyCode])

  const [products, setProducts] = useState<Product[]>([])
  const [planId, setPlanId] = useState<number | null>(null)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [promocode, setPromocode] = useState('')

  // ใบเสนอราคาสด
  const [quote, setQuote] = useState<Quote|null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [quoteError, setQuoteError] = useState('')

  // ชำระเงิน
  const [paying, setPaying] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // PayPal SDK
  const [paypalReady, setPaypalReady] = useState(false)
  const sdkCurrencyRef = useRef<string>('')
  const buttonsRenderedRef = useRef(false)

  // Trace
  const traceId = useMemo(() => {
    if (typeof window === 'undefined') return ''
    let t = localStorage.getItem('traceId')
    if (!t) { const u=(Math.random().toString(36).slice(2)+Date.now().toString(36)).toUpperCase(); t=`RPD-${u}`; localStorage.setItem('traceId',t) }
    return t
  }, [])

  // เติมข้อมูลจาก step ก่อนหน้า (สมัคร)
  useEffect(() => {
    const se = sessionStorage.getItem('signup_email'); if (se) setEmail(se)
    const sf = sessionStorage.getItem('signup_firstname'); if (sf) setFirstname(sf)
    const sl = sessionStorage.getItem('signup_lastname'); if (sl) setLastname(sl)
  }, [])

  // โหลดสกุลเงิน (จาก /api/currencies)
  useEffect(() => {
    let cancelled=false
    ;(async()=>{
      try{
        const r=await fetch('/api/currencies'); const j=await r.json()
        if(!r.ok) throw new Error(j?.error||'Failed to load currencies')
        if(!cancelled){
          const list=(j.currencies||[]).map((c:any)=>({id:+c.id,code:String(c.code)}))
          setCurrencies(list)
          if(!list.find(x=>x.id===currencyId)){
            const usd=list.find(x=>x.code==='USD')||list[0]; if(usd) setCurrencyId(usd.id)
          }
        }
      }catch{}
    })()
    return()=>{cancelled=true}
  },[]) // eslint-disable-line

  // โหลดแผน & ราคา (จาก /api/products?currency_id=..)
  useEffect(() => {
    let cancelled=false
    ;(async()=>{
      if(!currencyId) return
      try{
        setProducts([]); setQuote(null); setQuoteError('')
        const r=await fetch(`/api/products?currency_id=${currencyId}`); const j=await r.json()
        if(!r.ok) throw new Error(j?.error||'Failed to load products')
        if(!cancelled){
          setProducts(j.products||[])
          if(!planId && j.products?.length) setPlanId(j.products[0].pid)
        }
      }catch(e:any){ if(!cancelled) setQuoteError(e.message) }
    })()
    return()=>{cancelled=true}
  },[currencyId]) // eslint-disable-line

  // คำนวณ quote (จาก /api/order/quote)
  useEffect(() => {
    const t=setTimeout(()=>{ if(planId) fetchQuote() }, 200)
    return()=>clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[planId,billingCycle,promocode,currencyId])

  async function fetchQuote(){
    if(!planId) return
    try{
      setLoadingQuote(true); setQuoteError('')
      const r=await fetch('/api/order/quote',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({pid:planId,billing_cycle:billingCycle,currency_id:currencyId,promocode:promocode||undefined})})
      const j=await r.json()
      if(!r.ok) throw new Error(j?.error||'Failed to get quote')
      setQuote(j)
    }catch(e:any){ setQuote(null); setQuoteError(e.message) } finally{ setLoadingQuote(false) }
  }

  // Stripe
  async function handleStripeCheckout(){
    if(!email){ setErrorMsg('Please enter email'); return }
    if(!quote||!planId){ setErrorMsg('Price not ready. Please wait…'); return }
    setPaying(true); setErrorMsg('')
    try{
      const amount_cents=Math.round(quote.total.totalDue*100)
      const item_name=`${quote.plan.name} (${quote.plan.billingCycle})`
      document.cookie=`rh_currency_id=${currencyId};Path=/;Max-Age=${60*60*24*180};SameSite=Lax`
      document.cookie=`rh_currency_code=${currencyCode};Path=/;Max-Age=${60*60*24*180};SameSite=Lax`
      const r=await fetch('/api/checkout/stripe',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({traceId,plan_id:planId,billing_cycle:billingCycle,email,firstname,lastname,promocode:promocode||undefined,amount_cents,item_name})})
      const j=await r.json()
      if(!r.ok||!j?.url) throw new Error(j?.error||'Failed to create checkout')
      window.location.href=j.url
    }catch(e:any){ setErrorMsg(e.message||'Unexpected error'); setPaying(false) }
  }

  // ---------- PayPal Buttons SDK ----------
  useEffect(()=>{
    if(typeof window==='undefined') return
    if(!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) return

    if(sdkCurrencyRef.current===currencyCode && window.paypal){ setPaypalReady(true); return }

    sdkCurrencyRef.current=currencyCode
    setPaypalReady(false); buttonsRenderedRef.current=false
    // remove old sdk
    Array.from(document.querySelectorAll('script[src*="paypal.com/sdk/js"]')).forEach(s=>s.parentElement?.removeChild(s as any))
    // load new
    const script=document.createElement('script')
    const clientId=encodeURIComponent(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!)
    script.src=`https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${encodeURIComponent(currencyCode)}&intent=capture`
    script.async=true; script.onload=()=>setPaypalReady(true); script.onerror=()=>setPaypalReady(false)
    document.body.appendChild(script)
  },[currencyCode])

  useEffect(()=>{
    if(!paypalReady||!window.paypal||!quote||!email||!planId) return
    if(buttonsRenderedRef.current) return
    const el=document.getElementById('paypal-button-container'); if(!el) return
    el.innerHTML=''

    const amountCents=Math.round(quote.total.totalDue*100)

    window.paypal.Buttons({
      style:{ layout:'vertical', color:'gold', shape:'rect', label:'paypal' },
      createOrder: async ()=>{
        const r=await fetch('/api/paypal/create-order',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({amount_cents:amountCents,currency_code:currencyCode,context:{traceId,plan_id:planId,billing_cycle:billingCycle,promocode:promocode||undefined,email,firstname,lastname}})})
        const d=await r.json()
        if(!r.ok) throw new Error(d?.error||'create order failed')
        return d.id
      },
      onApprove: async (data:any)=>{
        const r=await fetch('/api/paypal/capture-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:data.orderID})})
        const j=await r.json()
        if(!r.ok) throw new Error(j?.error||'capture failed')
        window.location.href='/thank-you'
      },
      onError: (err:any)=>{ console.error('PayPal error',err); alert('เกิดข้อผิดพลาดระหว่างการชำระเงินด้วย PayPal') }
    }).render('#paypal-button-container')

    buttonsRenderedRef.current=true
  },[paypalReady,quote,email,firstname,lastname,planId,billingCycle,promocode,currencyCode,traceId])
  // ---------------------------------------

  const selectedProduct = products.find(p=>p.pid===planId)||null

  function onCurrencyChange(newId:number){
    setCurrencyId(newId)
    const code = currencies.find(c=>c.id===newId)?.code || 'USD'
    document.cookie=`rh_currency_id=${newId};Path=/;Max-Age=${60*60*24*180};SameSite=Lax`
    document.cookie=`rh_currency_code=${code};Path=/;Max-Age=${60*60*24*180};SameSite=Lax`
  }

  return (
    <>
      <Head><title>Billing – Rapidahost</title></Head>
      <main className="min-h-screen bg-gray-50">
        {/* Topbar */}
        <div className="bg-black text-white">
          <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="text-xl font-semibold">Rapidahost</div>
            <div className="flex items-center gap-3 text-sm">
              <span className="opacity-80">Quality • Cloudflare Enterprise</span>
              <select className="bg-black border border-white/20 rounded px-2 py-1" value={currencyId} onChange={e=>onCurrencyChange(parseInt(e.target.value,10))}>
                {currencies.length===0 && <option value={initialCurrencyId || 1}>{initialCurrencyCode || 'USD'}</option>}
                {currencies.map(c=>(<option key={c.id} value={c.id}>{c.code}</option>))}
              </select>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left form */}
          <section className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow p-6">
              <h1 className="text-2xl font-bold mb-1">Billing</h1>
              <p className="text-gray-600 mb-6">ดึงแผน/ราคา จาก WHMCS • รองรับคูปอง • จ่ายได้ทั้ง Stripe & PayPal</p>

              {errorMsg && <div className="mb-4 p-3 rounded bg-red-100 text-red-700">{errorMsg}</div>}
              {quoteError && <div className="mb-4 p-3 rounded bg-yellow-100 text-yellow-800">{quoteError}</div>}

              {/* Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">First name</label><input className="w-full border rounded-xl p-3" value={firstname} onChange={e=>setFirstname(e.target.value)} /></div>
                <div><label className="block text-sm font-medium mb-1">Last name</label><input className="w-full border rounded-xl p-3" value={lastname} onChange={e=>setLastname(e.target.value)} /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Email</label><input type="email" className="w-full border rounded-xl p-3" value={email} onChange={e=>setEmail(e.target.value)} /></div>
              </div>

              {/* Plan & Cycle */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Plan</label>
                  <select className="w-full border rounded-xl p-3" value={planId ?? ''} onChange={e=>setPlanId(e.target.value ? parseInt(e.target.value,10) : null)}>
                    {!products.length && <option value="">Loading…</option>}
                    {products.map(p => (<option key={p.pid} value={p.pid}>{p.name}</option>))}
                  </select>
                  {selectedProduct?.description && <p className="text-xs text-gray-500 mt-2" dangerouslySetInnerHTML={{ __html: selectedProduct.description }} />}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Billing cycle</label>
                  <select className="w-full border rounded-xl p-3" value={billingCycle} onChange={e=>setBillingCycle(e.target.value as BillingCycle)}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semiannually">Semiannually</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
              </div>

              {/* Coupon */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Promo code</label>
                  <input className="w-full border rounded-xl p-3" placeholder="(optional)" value={promocode} onChange={e=>setPromocode(e.target.value.trim())} />
                </div>
                <div className="flex items-end text-sm text-gray-500">
                  {selectedProduct?.pricing?.[billingCycle] != null
                    ? `Base: ${formatMoney(selectedProduct?.pricing?.[billingCycle] as number, currencyCode)}`
                    : 'N/A'}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center gap-3 flex-wrap">
                <button onClick={handleStripeCheckout} disabled={paying || loadingQuote || !quote || !planId}
                        className="px-6 py-3 rounded-2xl bg-black text-white hover:opacity-90 disabled:opacity-50">
                  {paying ? 'Processing…' : 'Pay with Stripe'}
                </button>
                <div id="paypal-button-container" className="min-w-[260px]" />
                <div className="text-xs text-gray-500 ml-auto">Trace ID: <span className="font-mono">{traceId}</span></div>
              </div>
            </div>
          </section>

          {/* Summary */}
          <aside>
            <div className="bg-white rounded-2xl shadow p-6 sticky top-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Order Summary</h2>
                {loadingQuote && <span className="text-xs text-gray-500">Refreshing…</span>}
              </div>
              <p className="text-gray-500 text-sm mb-4">ราคาสดจาก WHMCS • {currencyCode}</p>

              <div className="divide-y">
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{quote?.plan?.name || (selectedProduct?.name || '—')}</div>
                    <div className="text-xs text-gray-500 capitalize">{billingCycle}</div>
                  </div>
                  <div className="font-medium">
                    {quote ? formatMoney(quote.plan.baseAmount, currencyCode)
                          : (selectedProduct?.pricing?.[billingCycle] != null ? formatMoney(selectedProduct?.pricing?.[billingCycle] as number, currencyCode) : '--')}
                  </div>
                </div>

                <div className="py-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-gray-600">Subtotal</span><span>{quote ? formatMoney(quote.total.subtotal, currencyCode) : '--'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">Discount</span>
                    <span className={quote?.total.discount ? 'text-green-600' : ''}>
                      {quote ? (quote.total.discount ? `- ${formatMoney(quote.total.discount, currencyCode)}` : formatMoney(0, currencyCode)) : '--'}
                    </span>
                  </div>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <span className="text-base font-semibold">Total due today</span>
                  <span className="text-xl font-bold">{quote ? formatMoney(quote.total.totalDue, currencyCode) : '--'}</span>
                </div>
              </div>

              {quote?.coupon?.description && (
                <div className={`mt-3 text-xs px-3 py-2 rounded ${quote.coupon.valid ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  {quote.coupon.valid ? `Coupon applied: ${quote.coupon.description}` : `Coupon: ${quote.coupon.description}`}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  try {
    const country = String(req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || '')
    const currencyCode = countryToCurrency(country)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ? process.env.NEXT_PUBLIC_BASE_URL : `http://${req.headers.host}`

    const r = await fetch(`${baseUrl}/api/currencies`)
    const j = await r.json().catch(()=>({ currencies: [] }))
    let currencyId: number | null = null
    if (Array.isArray(j.currencies)) {
      const found = j.currencies.find((c: any) => String(c.code).toUpperCase() === currencyCode)
      if (found) currencyId = Number(found.id)
    }

    const hasCookie = (req.headers.cookie || '').includes('rh_currency_code=')
    if (!hasCookie) {
      res.setHeader('Set-Cookie', [
        `rh_currency_code=${encodeURIComponent(currencyCode)}; Path=/; Max-Age=${60*60*24*180}; SameSite=Lax`
      ])
    }

    return { props: { initialCurrencyId: currencyId, initialCurrencyCode: currencyCode } }
  } catch {
    return { props: { initialCurrencyId: null, initialCurrencyCode: 'USD' } }
  }
}
