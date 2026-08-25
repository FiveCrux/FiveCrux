import {
  Client,
  Environment,
  LogLevel,
  OrdersController,
  PaymentsController,
} from "@paypal/paypal-server-sdk"

/**
 * PayPal client for FiveCrux's OWN sales — the cart: props, ad slots,
 * featured-script slots, subscriptions. FiveCrux is the single merchant and
 * the single payee, which is exactly what a standard Business account covers.
 *
 * NOT used for seller scripts. Those still redirect to the seller's own store
 * so their money never passes through FiveCrux (see
 * .hudson/specs/paypal-migration.md, D3) — collecting it would make FiveCrux
 * merchant of record and hand it every refund, chargeback and payout.
 *
 * Docs: https://developer.paypal.com/docs/api/orders/v2/
 * Package: @paypal/paypal-server-sdk (the older @paypal/checkout-server-sdk is
 * deprecated and was removed from this project).
 */

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET

/**
 * Live only when explicitly asked for. Defaulting to sandbox means a missing or
 * mistyped value fails safe: test money, not real money.
 */
export const PAYPAL_IS_LIVE = process.env.PAYPAL_ENV === "live"

/**
 * Currency for every order we create. Prices are displayed in EUR across the
 * site, so charging in anything else would quietly bill a different amount than
 * the buyer was shown.
 */
export const PAYPAL_CURRENCY = process.env.PAYPAL_CURRENCY || "EUR"

/** The webhook id from the PayPal dashboard — required to verify signatures. */
export const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID

export const PAYPAL_API_BASE = PAYPAL_IS_LIVE
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com"

// SECURITY: refuse to boot a production deploy pointed at sandbox. Sandbox
// credentials in production means every "successful" payment is fake money —
// the platform would hand out ad slots and props for nothing and nobody would
// notice until reconciliation. Mirrors the dev-flag boot guard in auth.ts.
if (process.env.NODE_ENV === "production" && CLIENT_ID && !PAYPAL_IS_LIVE) {
  throw new Error(
    "PayPal is configured for SANDBOX in a production build. Set PAYPAL_ENV=live."
  )
}

export function isPayPalConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET)
}

let cachedClient: Client | null = null

/**
 * Throws when unconfigured rather than returning null, so a missing credential
 * surfaces as a clear server error at the call site instead of a confusing
 * downstream crash.
 */
export function getPayPalClient(): Client {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "PayPal is not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)."
    )
  }
  if (cachedClient) return cachedClient

  cachedClient = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: CLIENT_ID,
      oAuthClientSecret: CLIENT_SECRET,
    },
    environment: PAYPAL_IS_LIVE ? Environment.Production : Environment.Sandbox,
    // Bodies carry buyer details and amounts — log the request line only.
    logging: {
      logLevel: LogLevel.Error,
      logRequest: { logBody: false },
      logResponse: { logHeaders: false },
    },
  })
  return cachedClient
}

export function getOrdersController(): OrdersController {
  return new OrdersController(getPayPalClient())
}

export function getPaymentsController(): PaymentsController {
  return new PaymentsController(getPayPalClient())
}

/**
 * Raw OAuth token, for the REST calls the SDK does not cover — notably webhook
 * signature verification, which has no SDK helper.
 */
export async function getPayPalAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("PayPal is not configured.")
  }
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    throw new Error(`PayPal OAuth failed: ${res.status}`)
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error("PayPal OAuth returned no token")
  return data.access_token
}

/**
 * Verify a webhook really came from PayPal.
 *
 * The SDK ships no helper for this, so it calls the REST endpoint directly.
 * This is not optional: without it the webhook is an open "mark my order paid"
 * endpoint that would provision paid ad slots to anyone who can POST.
 *
 * `rawBody` must be the UNPARSED request body — re-serialising a parsed object
 * can reorder keys and change whitespace, and the signature is computed over
 * the exact bytes PayPal sent.
 */
export async function verifyPayPalWebhook(args: {
  headers: Headers
  rawBody: string
}): Promise<boolean> {
  if (!PAYPAL_WEBHOOK_ID) {
    console.error("[paypal] PAYPAL_WEBHOOK_ID is not set — refusing the webhook")
    return false
  }

  const h = (name: string) => args.headers.get(name) || ""
  const transmissionId = h("paypal-transmission-id")
  const transmissionTime = h("paypal-transmission-time")
  const transmissionSig = h("paypal-transmission-sig")
  const certUrl = h("paypal-cert-url")
  const authAlgo = h("paypal-auth-algo")

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return false
  }

  // The cert must come from PayPal. Without this check a forged header could
  // point verification at an attacker-controlled certificate.
  let certHost: string
  try {
    certHost = new URL(certUrl).hostname
  } catch {
    return false
  }
  if (!/(^|\.)paypal\.com$/.test(certHost)) {
    console.error("[paypal] webhook cert_url is not a paypal.com host:", certHost)
    return false
  }

  try {
    const token = await getPayPalAccessToken()
    const res = await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          cert_url: certUrl,
          auth_algo: authAlgo,
          transmission_sig: transmissionSig,
          webhook_id: PAYPAL_WEBHOOK_ID,
          webhook_event: JSON.parse(args.rawBody),
        }),
        signal: AbortSignal.timeout(15_000),
      }
    )
    if (!res.ok) return false
    const data = (await res.json()) as { verification_status?: string }
    return data.verification_status === "SUCCESS"
  } catch (error) {
    console.error("[paypal] webhook verification failed:", error)
    return false
  }
}

/** Money as PayPal wants it: a fixed-2dp string, never a float. */
export function toPayPalAmount(value: number | string): string {
  return Number(value).toFixed(2)
}
