// Verifies the new FiveM-login checkout phase-1: createBasket → fetch auth URL.
// Proves that for an auth-required (FiveM) store, Tebex returns a login URL
// (instead of the 422 we got when adding packages without auth).
//   node scripts/tebex-auth-check.mjs
import { readFileSync } from "fs";

function envVal(key) {
  if (process.env[key]) return process.env[key];
  const txt = readFileSync(".env.local", "utf8");
  const m = txt.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, "m"));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : "";
}

const BASE = "https://headless.tebex.io/api";
const token = envVal("TEBEX_PUBLIC_TOKEN");

async function main() {
  if (!token) { console.error("No TEBEX_PUBLIC_TOKEN"); process.exit(2); }
  console.log(`▶ Auth-flow check — store token ${token.slice(0, 6)}…\n`);

  const createRes = await fetch(`${BASE}/accounts/${token}/baskets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      complete_url: "https://www.fivecrux.com/cart?payment=success",
      cancel_url: "https://www.fivecrux.com/cart?payment=cancelled",
    }),
  });
  const createBody = await createRes.json().catch(() => ({}));
  const basket = createBody.data ?? createBody;
  const ident = basket.ident;
  if (!ident) { console.log(`✗ createBasket failed: ${JSON.stringify(createBody).slice(0, 200)}`); process.exit(1); }
  console.log(`✓ Basket created: ${ident}`);

  const returnUrl = "https://www.fivecrux.com/api/cart/tebex-continue?ident=" + ident;
  const authRes = await fetch(
    `${BASE}/accounts/${token}/baskets/${ident}/auth?returnUrl=${encodeURIComponent(returnUrl)}`,
    { headers: { Accept: "application/json" } }
  );
  const authBody = await authRes.json().catch(() => ({}));
  const opts = Array.isArray(authBody) ? authBody : authBody.data ?? [];

  if (opts.length > 0) {
    console.log(`✓ Store requires login — ${opts.length} auth provider(s):`);
    for (const o of opts) console.log(`   • ${o.name}: ${o.url.slice(0, 80)}…`);
    console.log("\n→ Phase-1 works: buyer gets redirected to this login, then back to tebex-continue → payment.");
  } else {
    console.log("✓ Store requires NO login (universal). Packages add directly → checkout. No redirect needed.");
  }
}
main().catch((e) => { console.error("auth-check failed:", e.message); process.exit(1); });
