// Central money formatter — ONE place decides how a price renders, so cards,
// detail pages, cart and admin never disagree on the currency symbol. Whatever
// currency a seller selected (stored as `currency_symbol` on the item) is what
// gets shown everywhere. Items with no stored currency fall back to the single
// app default below (keeps a consistent look until a currency is chosen).
export const DEFAULT_CURRENCY_SYMBOL = "$"

/** `29.99`, `"€"` -> `"€29.99"`. Coerces string prices and null symbols safely. */
export function formatPrice(
  amount: number | string | null | undefined,
  currencySymbol?: string | null
): string {
  const n = Number(amount) || 0
  const sym = currencySymbol || DEFAULT_CURRENCY_SYMBOL
  return `${sym}${n.toFixed(2)}`
}

/** Just the symbol, with the shared fallback applied. */
export function currencySymbolOf(currencySymbol?: string | null): string {
  return currencySymbol || DEFAULT_CURRENCY_SYMBOL
}
