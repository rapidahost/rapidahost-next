// lib/currency.ts
export function formatMoney(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount)
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`
  }
}
