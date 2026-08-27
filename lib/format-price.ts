// Central money formatter — ONE place decides how a price renders, so cards,
// detail pages, cart and admin never disagree.
//
// The symbol is resolved in this order:
//   1. the symbol stored on the item (a seller who picked one)
//   2. the symbol for the item's CURRENCY CODE
//   3. the app default
//
// Step 2 is the important one. Most listings store a currency code but no
// symbol — 144 of 155 at the time of writing, all EUR — and falling straight
// from a missing symbol to the default printed "$24.99" on a product priced and
// charged in euros. Cheaper-looking than it is, in the wrong currency, on most
// of the catalogue.
export const DEFAULT_CURRENCY_SYMBOL = "$"

/** Only the currencies this marketplace actually prices in. An unknown code
 *  falls through to showing the code itself, which is honest — better a buyer
 *  reads "PLN 24.99" than a confident, wrong "$24.99". */
const SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  INR: "₹",
  AUD: "A$",
  CAD: "C$",
}

/** The symbol to print for an item, from its stored symbol or its currency code. */
export function currencySymbolOf(
  currencySymbol?: string | null,
  currency?: string | null
): string {
  if (currencySymbol) return currencySymbol
  const code = String(currency ?? "").trim().toUpperCase()
  if (!code) return DEFAULT_CURRENCY_SYMBOL
  // A known code gets its symbol; an unknown one is shown as the code plus a
  // space, so "PLN 24.99" reads as a price rather than "PLN24.99".
  return SYMBOLS[code] ?? `${code} `
}

/** `29.99`, `"€"` -> `"€29.99"`. Coerces string prices and null symbols safely. */
export function formatPrice(
  amount: number | string | null | undefined,
  currencySymbol?: string | null,
  currency?: string | null
): string {
  const n = Number(amount) || 0
  return `${currencySymbolOf(currencySymbol, currency)}${n.toFixed(2)}`
}
