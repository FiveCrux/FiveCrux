// READ-ONLY: verify the real Tebex public token works + list the store's packages.
// Reads TEBEX_PUBLIC_TOKEN from .env.local. Makes only GET calls to the real
// Tebex Headless API. Prints package ids/names/prices (NOT the token).
import { readFileSync } from "fs";

function envVal(key) {
  if (process.env[key]) return process.env[key];
  const txt = readFileSync(".env.local", "utf8");
  const m = txt.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, "m"));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : "";
}

const BASE = process.env.TEBEX_HEADLESS_BASE_URL || "https://headless.tebex.io/api";
const token = envVal("TEBEX_PUBLIC_TOKEN");

async function get(path) {
  const res = await fetch(`${BASE}/accounts/${token}${path}`, { headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  if (!token) { console.error("No TEBEX_PUBLIC_TOKEN in .env.local"); process.exit(2); }
  console.log(`▶ Tebex Headless: ${BASE} (token ${token.slice(0, 6)}…)\n`);

  const pkgs = await get("/packages");
  if (pkgs.status !== 200) {
    console.log(`✗ /packages → HTTP ${pkgs.status}: ${JSON.stringify(pkgs.body).slice(0, 200)}`);
    console.log("\nToken may be invalid, or the store/project isn't set up for Headless yet.");
    process.exit(1);
  }
  const list = Array.isArray(pkgs.body) ? pkgs.body : (pkgs.body?.data ?? []);
  console.log(`✓ Token works. Store has ${list.length} package(s):`);
  for (const p of list) {
    console.log(`   • id=${p.id}  "${p.name}"  ${p.total_price ?? p.base_price} ${p.currency ?? ""}`);
  }
  if (list.length === 0) {
    console.log("   (no packages yet — they must be created in the Tebex panel)");
  }

  const cats = await get("/categories");
  const clist = Array.isArray(cats.body) ? cats.body : (cats.body?.data ?? []);
  console.log(`\nCategories: ${clist.map((c) => c.name).join(", ") || "(none)"}`);
}
main().catch((e) => { console.error("tebex-check failed:", e.message); process.exit(1); });
