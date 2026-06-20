// READ/CREATE test against the REAL Tebex store: build a basket with a package
// and fetch the hosted checkout URL. NO payment is made (basket is throwaway).
// Proves the live integration: createBasket → addPackage → checkout URL.
//   node scripts/tebex-real-basket.mjs <packageId>
import { readFileSync } from "fs";

function envVal(key) {
  if (process.env[key]) return process.env[key];
  const txt = readFileSync(".env.local", "utf8");
  const m = txt.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, "m"));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : "";
}

const BASE = "https://headless.tebex.io/api";
const token = envVal("TEBEX_PUBLIC_TOKEN");
const packageId = Number(process.argv[2] || 7513923);

async function main() {
  if (!token) { console.error("No TEBEX_PUBLIC_TOKEN"); process.exit(2); }
  console.log(`▶ Real Tebex basket test — store token ${token.slice(0, 6)}…, package ${packageId}\n`);

  // 1. Create a basket.
  const createRes = await fetch(`${BASE}/accounts/${token}/baskets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      complete_url: "https://www.fivecrux.com/cart?payment=success",
      cancel_url: "https://www.fivecrux.com/cart?payment=cancelled",
      complete_auto_redirect: true,
    }),
  });
  const createBody = await createRes.json().catch(() => ({}));
  if (createRes.status !== 200) {
    console.log(`✗ createBasket → HTTP ${createRes.status}: ${JSON.stringify(createBody).slice(0, 300)}`);
    process.exit(1);
  }
  const basket = createBody.data ?? createBody;
  const ident = basket.ident;
  console.log(`✓ Basket created: ${ident}`);

  // 2. Add the package.
  const addRes = await fetch(`${BASE}/baskets/${ident}/packages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ package_id: packageId, quantity: 1 }),
  });
  const addBody = await addRes.json().catch(() => ({}));
  if (addRes.status !== 200) {
    console.log(`✗ addPackage → HTTP ${addRes.status}: ${JSON.stringify(addBody).slice(0, 300)}`);
    process.exit(1);
  }
  const withPkg = addBody.data ?? addBody;
  console.log(`✓ Package added. Basket total: ${withPkg.total_price} ${withPkg.currency ?? ""}`);

  // 3. Hosted checkout URL.
  const checkout = withPkg.links?.checkout || withPkg.links?.payment || basket.links?.checkout;
  console.log(`\n✓ HOSTED CHECKOUT URL:\n   ${checkout}\n`);
  console.log("→ Real Tebex integration works (basket + checkout). No payment was made.");
}
main().catch((e) => { console.error("real basket test failed:", e.message); process.exit(1); });
