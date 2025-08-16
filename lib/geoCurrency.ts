// lib/geoCurrency.ts
// ISO 3166-1 alpha-2 -> ISO 4217
const MAP: Record<string, string> = {
  US: 'USD', CA: 'CAD', MX: 'MXN',
  GB: 'GBP', IE: 'EUR',
  FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR',
  SE: 'SEK', NO: 'NOK', DK: 'DKK', CH: 'CHF',
  PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  RO: 'RON', BG: 'BGN',
  RU: 'RUB', TR: 'TRY', IL: 'ILS', SA: 'SAR', AE: 'AED', QA: 'QAR', KW: 'KWD',
  IN: 'INR', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR',
  TH: 'THB', SG: 'SGD', MY: 'MYR', ID: 'IDR', PH: 'PHP', VN: 'VND', KH: 'KHR', LA: 'LAK', MM: 'MMK',
  JP: 'JPY', KR: 'KRW', CN: 'CNY', HK: 'HKD', TW: 'TWD',
  AU: 'AUD', NZ: 'NZD',
  ZA: 'ZAR', NG: 'NGN', KE: 'KES', EG: 'EGP',
  BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
}

export function countryToCurrency(countryCode?: string | null): string {
  const cc = (countryCode || '').toUpperCase()
  return MAP[cc] || 'USD'
}

