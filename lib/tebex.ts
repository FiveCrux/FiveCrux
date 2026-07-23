import { createHash, createHmac, timingSafeEqual } from "crypto";

/**
 * Tebex Headless API client for FiveCrux.
 *
 * This is a PER-SELLER integration. Every seller on FiveCrux owns their OWN
 * Tebex webstore, so most functions take a `token` argument (that seller's
 * webstore public/project token). When omitted, calls fall back to FiveCrux's
 * OWN store token (`TEBEX_PUBLIC_TOKEN`), which is used for platform charges
 * such as advertisement and featured-slot fees.
 *
 * Reference docs:
 * - Overview:  https://docs.tebex.io/developers/headless-api/overview
 * - Endpoints: https://docs.tebex.io/developers/headless-api/endpoints
 * - Webhooks:  https://docs.tebex.io/developers/webhooks/overview
 *
 * Framework-agnostic: uses only native `fetch` + node `crypto`, no Next.js
 * imports, so it can be used inside any API route or server action.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Base URL for the Tebex Headless API.
 * Account-scoped endpoints live under `/accounts/{token}`, basket-scoped
 * mutation endpoints live under `/baskets/{basketIdent}`.
 *
 * Overridable via TEBEX_HEADLESS_BASE_URL so tests can point the client at a
 * local mock server (scripts/mock-tebex-server.mjs) — the app code stays the
 * real integration; only the endpoint is swapped, exactly like any HTTP client.
 */
export const TEBEX_HEADLESS_BASE_URL =
  process.env.TEBEX_HEADLESS_BASE_URL || "https://headless.tebex.io/api";

/**
 * FiveCrux's OWN webstore public token (project/public token).
 * Used as the default `token` for platform-fee baskets (ads, featured slots).
 * Read directly from process.env with a safe fallback so importing this
 * module never throws even when the env var is missing.
 */
export const FIVECRUX_TEBEX_PUBLIC_TOKEN = process.env.TEBEX_PUBLIC_TOKEN ?? "";

/**
 * FiveCrux's Tebex private/secret key. Reserved for any future server-side
 * (non-headless) calls that require the secret. Not required by the Headless
 * endpoints below, which authenticate by the public token in the path.
 */
export const FIVECRUX_TEBEX_PRIVATE_KEY = process.env.TEBEX_PRIVATE_KEY ?? "";

/**
 * Secret used to verify incoming Tebex webhook signatures.
 * Found in the Tebex panel under Developers > Webhooks > Endpoints.
 */
export const FIVECRUX_TEBEX_WEBHOOK_SECRET = process.env.TEBEX_WEBHOOK_SECRET ?? "";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A monetary value as returned by Tebex (already a number in the store currency). */
export interface TebexPrice {
  amount: number;
  currency: string;
}

/** A purchasable package in a Tebex webstore. */
export interface TebexPackage {
  id: number;
  name: string;
  description: string;
  image: string | null;
  type: string;
  category?: {
    id: number;
    name: string;
  };
  base_price: number;
  sales_tax: number;
  total_price: number;
  currency: string;
  discount: number;
  disable_quantity: boolean;
  disable_gifting: boolean;
  expiration_date: string | null;
  created_at: string;
  updated_at: string;
}

/** A storefront category, optionally including its packages. */
export interface TebexCategory {
  id: number;
  name: string;
  slug: string;
  parent: TebexCategory | null;
  description: string;
  packages: TebexPackage[];
  order: number;
  display_type: string;
}

/** A package row inside a basket. */
export interface TebexBasketPackage {
  id: number;
  name: string;
  description: string;
  in_basket: {
    quantity: number;
    price: number;
    gift_username_id: string | null;
    gift_username: string | null;
  };
}

/** Hypermedia links returned with a basket. `checkout` is only present for unpaid baskets. */
export interface TebexBasketLinks {
  checkout: string;
  [key: string]: string;
}

/** A Tebex basket. */
export interface TebexBasket {
  ident: string;
  complete: boolean;
  id: number;
  country: string;
  ip: string;
  username_id: number | null;
  username: string | null;
  cancel_url: string;
  complete_url: string | null;
  complete_auto_redirect: boolean;
  base_price: number;
  sales_tax: number;
  total_price: number;
  currency: string;
  email: string | null;
  custom: unknown;
  packages: TebexBasketPackage[];
  coupons: Array<{ coupon_code: string }>;
  giftcards: Array<{ card_number: string }>;
  creator_code?: string;
  links: TebexBasketLinks;
}

/** Options accepted when creating a basket. */
export interface CreateBasketOptions {
  /**
   * URL the customer is sent to AFTER a successful payment (Tebex `complete_url`).
   * Some Tebex docs/SDKs refer to this as `returnUrl`; we accept either.
   */
  completeUrl?: string;
  /** URL the customer is sent to if they cancel checkout (Tebex `cancel_url`). */
  returnUrl?: string;
  /** Arbitrary JSON echoed back on the basket and webhook payloads (e.g. FiveCrux order id). */
  custom?: Record<string, unknown>;
  /** If true, Tebex auto-redirects to `complete_url` after payment. */
  completeAutoRedirect?: boolean;
}

/** Tebex wraps most responses in `{ data: ... }`. */
interface TebexEnvelope<T> {
  data: T;
}

// ---------------------------------------------------------------------------
// Internal request helper
// ---------------------------------------------------------------------------

/**
 * Resolve the effective public token: caller-supplied seller token, otherwise
 * FiveCrux's own store token. Throws if neither is available.
 */
function resolveToken(token?: string): string {
  const resolved = token || FIVECRUX_TEBEX_PUBLIC_TOKEN;
  if (!resolved) {
    throw new Error(
      "Tebex public token missing: pass a seller token or set TEBEX_PUBLIC_TOKEN."
    );
  }
  return resolved;
}

/**
 * Perform a request against the Headless API and unwrap the `{ data }` envelope.
 * Throws a descriptive error on any non-2xx response.
 */
async function tebexRequest<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown }
): Promise<T> {
  const url = `${TEBEX_HEADLESS_BASE_URL}${path}`;
  const { body, ...rest } = init ?? {};

  const response = await fetch(url, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(rest.headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      // ignore body read failures
    }
    throw new Error(
      `Tebex Headless API ${rest.method ?? "GET"} ${path} failed: ` +
        `${response.status} ${response.statusText}${detail ? ` - ${detail}` : ""}`
    );
  }

  // Some mutation endpoints (204) return no body.
  if (response.status === 204) {
    return undefined as T;
  }

  const json = (await response.json()) as TebexEnvelope<T> | T;
  return (json && typeof json === "object" && "data" in (json as object)
    ? (json as TebexEnvelope<T>).data
    : (json as T));
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/**
 * List a webstore's categories.
 * GET /accounts/{token}/categories[?includePackages=1]
 *
 * @param token Seller webstore public token (defaults to FiveCrux's store).
 * @param includePackages When true, embeds each category's packages.
 */
export async function getCategories(
  token?: string,
  includePackages = false
): Promise<TebexCategory[]> {
  const t = resolveToken(token);
  const query = includePackages ? "?includePackages=1" : "";
  return tebexRequest<TebexCategory[]>(`/accounts/${t}/categories${query}`);
}

/**
 * List all packages for a webstore.
 * GET /accounts/{token}/packages
 *
 * @param token Seller webstore public token (defaults to FiveCrux's store).
 */
export async function getPackages(token?: string): Promise<TebexPackage[]> {
  const t = resolveToken(token);
  return tebexRequest<TebexPackage[]>(`/accounts/${t}/packages`);
}

/**
 * Fetch a single package.
 * GET /accounts/{token}/packages/{packageId}
 *
 * @param token Seller webstore public token (defaults to FiveCrux's store).
 * @param packageId Tebex package id.
 */
export async function getPackage(
  token: string | undefined,
  packageId: number | string
): Promise<TebexPackage> {
  const t = resolveToken(token);
  return tebexRequest<TebexPackage>(`/accounts/${t}/packages/${packageId}`);
}

// ---------------------------------------------------------------------------
// Baskets
// ---------------------------------------------------------------------------

/**
 * Create a basket. Returns the basket including `ident` and `links.checkout`.
 * POST /accounts/{token}/baskets
 *
 * Body fields per docs: `complete_url`, `cancel_url`, `custom`,
 * `complete_auto_redirect`.
 *
 * @param token Seller webstore public token (defaults to FiveCrux's store).
 * @param options Return/complete URLs, custom metadata, auto-redirect flag.
 */
export async function createBasket(
  token: string | undefined,
  options: CreateBasketOptions
): Promise<TebexBasket> {
  const t = resolveToken(token);
  return tebexRequest<TebexBasket>(`/accounts/${t}/baskets`, {
    method: "POST",
    body: {
      complete_url: options.completeUrl,
      cancel_url: options.returnUrl,
      custom: options.custom,
      complete_auto_redirect: options.completeAutoRedirect ?? true,
    },
  });
}

/**
 * Fetch a basket by its identifier.
 * GET /accounts/{token}/baskets/{basketIdent}
 *
 * @param token Seller webstore public token (defaults to FiveCrux's store).
 * @param basketIdent Basket identifier returned by {@link createBasket}.
 */
export async function getBasket(
  token: string | undefined,
  basketIdent: string
): Promise<TebexBasket> {
  const t = resolveToken(token);
  return tebexRequest<TebexBasket>(`/accounts/${t}/baskets/${basketIdent}`);
}

/**
 * Add a package to a basket.
 * POST /baskets/{basketIdent}/packages
 * Body fields per docs: `package_id`, `quantity`.
 *
 * Note: this endpoint is basket-scoped and does NOT include the account token
 * in its path.
 *
 * @param token Seller webstore public token (reserved for symmetry / future auth).
 * @param basketIdent Basket identifier.
 * @param packageId Package to add.
 * @param quantity Quantity (defaults to 1).
 */
export async function addPackageToBasket(
  token: string | undefined,
  basketIdent: string,
  packageId: number | string,
  quantity = 1
): Promise<TebexBasket> {
  resolveToken(token); // validate a token is available for callers expecting it
  return tebexRequest<TebexBasket>(`/baskets/${basketIdent}/packages`, {
    method: "POST",
    body: {
      package_id: Number(packageId),
      // Packages configured with `disable_quantity` REJECT a quantity field
      // ("One of the options provided is invalid" → 400), which broke Buy Now
      // for such packages. Only send quantity for genuine multi-quantity adds;
      // Tebex defaults to 1 when it's omitted.
      ...(Number(quantity) > 1 ? { quantity: Number(quantity) } : {}),
    },
  });
}

/**
 * Remove a package from a basket.
 * POST /baskets/{basketIdent}/packages/remove
 * Body field per docs: `package_id`.
 *
 * @param token Seller webstore public token (reserved for symmetry / future auth).
 * @param basketIdent Basket identifier.
 * @param packageId Package to remove.
 */
export async function removePackageFromBasket(
  token: string | undefined,
  basketIdent: string,
  packageId: number | string
): Promise<TebexBasket> {
  resolveToken(token);
  return tebexRequest<TebexBasket>(`/baskets/${basketIdent}/packages/remove`, {
    method: "POST",
    body: {
      package_id: Number(packageId),
    },
  });
}

// ---------------------------------------------------------------------------
// Coupons & creator codes
// ---------------------------------------------------------------------------

/**
 * Apply a coupon code to a basket.
 * POST /accounts/{token}/baskets/{basketIdent}/coupons
 *
 * @param token Seller webstore public token (defaults to FiveCrux's store).
 * @param basketIdent Basket identifier.
 * @param couponCode The coupon code to apply.
 */
export async function applyCoupon(
  token: string | undefined,
  basketIdent: string,
  couponCode: string
): Promise<TebexBasket> {
  const t = resolveToken(token);
  return tebexRequest<TebexBasket>(
    `/accounts/${t}/baskets/${basketIdent}/coupons`,
    {
      method: "POST",
      body: { coupon_code: couponCode },
    }
  );
}

/**
 * Remove a coupon code from a basket.
 * POST /accounts/{token}/baskets/{basketIdent}/coupons/remove
 *
 * @param token Seller webstore public token (defaults to FiveCrux's store).
 * @param basketIdent Basket identifier.
 * @param couponCode The coupon code to remove.
 */
export async function removeCoupon(
  token: string | undefined,
  basketIdent: string,
  couponCode: string
): Promise<TebexBasket> {
  const t = resolveToken(token);
  return tebexRequest<TebexBasket>(
    `/accounts/${t}/baskets/${basketIdent}/coupons/remove`,
    {
      method: "POST",
      body: { coupon_code: couponCode },
    }
  );
}

/**
 * Apply a creator code to a basket.
 * POST /accounts/{token}/baskets/{basketIdent}/creator-codes
 *
 * @param token Seller webstore public token (defaults to FiveCrux's store).
 * @param basketIdent Basket identifier.
 * @param creatorCode The creator code to apply.
 */
export async function applyCreatorCode(
  token: string | undefined,
  basketIdent: string,
  creatorCode: string
): Promise<TebexBasket> {
  const t = resolveToken(token);
  return tebexRequest<TebexBasket>(
    `/accounts/${t}/baskets/${basketIdent}/creator-codes`,
    {
      method: "POST",
      body: { creator_code: creatorCode },
    }
  );
}

/**
 * Remove a creator code from a basket.
 * POST /accounts/{token}/baskets/{basketIdent}/creator-codes/remove
 *
 * @param token Seller webstore public token (defaults to FiveCrux's store).
 * @param basketIdent Basket identifier.
 */
export async function removeCreatorCode(
  token: string | undefined,
  basketIdent: string
): Promise<TebexBasket> {
  const t = resolveToken(token);
  return tebexRequest<TebexBasket>(
    `/accounts/${t}/baskets/${basketIdent}/creator-codes/remove`,
    {
      method: "POST",
      body: {},
    }
  );
}

// ---------------------------------------------------------------------------
// Basket auth & checkout
// ---------------------------------------------------------------------------

/** A single basket-auth provider option returned by the auth endpoint. */
export interface TebexBasketAuthOption {
  name: string;
  url: string;
}

/**
 * Get the basket authentication URLs. Customers must authenticate against a
 * supported provider before checkout for stores that require it. Each returned
 * option carries a `url` the customer is redirected to; after auth Tebex sends
 * them back to `returnUrl`.
 *
 * GET /accounts/{token}/baskets/{basketIdent}/auth?returnUrl={returnUrl}
 *
 * @param token Seller webstore public token (defaults to FiveCrux's store).
 * @param basketIdent Basket identifier.
 * @param returnUrl Where to send the customer after authenticating.
 */
export async function getBasketAuthUrl(
  token: string | undefined,
  basketIdent: string,
  returnUrl: string
): Promise<TebexBasketAuthOption[]> {
  const t = resolveToken(token);
  const query = `?returnUrl=${encodeURIComponent(returnUrl)}`;
  return tebexRequest<TebexBasketAuthOption[]>(
    `/accounts/${t}/baskets/${basketIdent}/auth${query}`
  );
}

/**
 * Derive the hosted checkout URL from a basket's `links.checkout`.
 * Only present on unpaid baskets; throws if absent.
 *
 * @param basket A basket returned by {@link createBasket} or {@link getBasket}.
 */
export function getCheckoutUrl(basket: TebexBasket): string {
  const url = basket?.links?.checkout;
  if (!url) {
    throw new Error(
      "Basket has no checkout link (links.checkout). " +
        "The basket may already be paid/completed."
    );
  }
  return url;
}

// ---------------------------------------------------------------------------
// Webhook verification
// ---------------------------------------------------------------------------

/**
 * Verify an incoming Tebex webhook signature.
 *
 * Per the Tebex docs (https://docs.tebex.io/developers/webhooks/overview):
 *   "The signature is generated by SHA256 hashing the JSON body and then
 *    building a SHA256 HMAC with the body hash as the data/content and your
 *    webhook secret as the key."
 *
 * The signature arrives in the `X-Signature` header. The body hash MUST be
 * computed over the RAW request body bytes — do NOT re-serialize a parsed
 * object, or the signature will mismatch.
 *
 * @param rawBody Raw request body exactly as received (string or Buffer).
 * @param signatureHeader Value of the `X-Signature` header.
 * @param secret Webhook secret (defaults to TEBEX_WEBHOOK_SECRET).
 * @returns true when the computed signature matches the header.
 */
export function verifyTebexWebhook(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  secret: string = FIVECRUX_TEBEX_WEBHOOK_SECRET
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  // 1. SHA256 hash of the raw JSON body (hex digest).
  const bodyHash = createHash("sha256")
    .update(rawBody)
    .digest("hex");

  // 2. HMAC-SHA256 of that hash, keyed by the webhook secret (hex digest).
  const expected = createHmac("sha256", secret)
    .update(bodyHash)
    .digest("hex");

  // Constant-time comparison to avoid timing attacks.
  const expectedBuf = Buffer.from(expected, "hex");
  let providedBuf: Buffer;
  try {
    providedBuf = Buffer.from(signatureHeader, "hex");
  } catch {
    return false;
  }
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, providedBuf);
}

/** Known Tebex webhook event types relevant to FiveCrux. */
export type TebexWebhookType =
  | "validation.webhook"
  | "payment.completed"
  | "payment.declined"
  | "payment.refunded"
  | "payment.chargeback"
  | "recurring-payment.started"
  | "recurring-payment.renewed"
  | "recurring-payment.ended"
  | "recurring-payment.cancellation.requested"
  | "recurring-payment.cancellation.aborted"
  | (string & {});

/** Minimal shape of a Tebex webhook payload. */
export interface TebexWebhookPayload<T = unknown> {
  id: string;
  type: TebexWebhookType;
  date: string;
  subject: T;
}
