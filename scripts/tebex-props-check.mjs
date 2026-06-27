// READ-ONLY: lists packages in the store's "PROPS" category (what FiveCrux
// auto-pulls as props). Empty is fine — add a package to PROPS in Tebex and it
// shows here. node scripts/tebex-props-check.mjs
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
  const res = await fetch(`${BASE}/accounts/${token}/categories?includePackages=1`, {
    headers: { Accept: "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  const cats = Array.isArray(body) ? body : body.data ?? [];
  const props = cats.find((c) => (c.name || "").trim().toLowerCase() === "props");
  if (!props) { console.log('✗ No "PROPS" category found in the store.'); return; }
  const pkgs = props.packages ?? [];
  console.log(`✓ "PROPS" category — ${pkgs.length} package(s):`);
  for (const p of pkgs) console.log(`   • id=${p.id}  ${p.name}  ${p.total_price} ${p.currency}`);
  if (pkgs.length === 0) console.log("   (empty — add a File Download package to PROPS in Tebex; it'll auto-list on FiveCrux)");
}
main().catch((e) => { console.error("props-check failed:", e.message); process.exit(1); });
