// Guard for entitlement provisioning maths.
//
// Runs WITHOUT a server or a database — lib/slot-count.ts is kept import-free
// precisely so this can exercise the real function rather than a copy of it.
//
//   npx tsx scripts/check-provisioning.mjs

import { slotsForCartLine } from "../lib/slot-count.ts"

let pass = 0, fail = 0
const check = (name, cond, extra = "") => {
  if (cond) { console.log(`  ✓ ${name}`); pass++ }
  else { console.log(`  ✗ ${name} ${extra}`); fail++ }
}

console.log("\n▶ Provisioning guards\n")

// ---------------------------------------------------------------------------
// Slots must scale with quantity.
//
// The cart charges price x quantity, and /api/cart/add increments quantity when
// the same pack is added a second time. Provisioning used to read only the
// pack's own slot count, so a buyer who took two Premium ad packs paid EUR 200
// and received 3 slots instead of 6. Nothing surfaced that — the order looked
// correct, the money was correct, only the entitlement was short.
// ---------------------------------------------------------------------------
console.log("slots scale with quantity")

for (const [label, meta, want] of [
  ["one premium pack (3 slots)",        { slotsToAdd: 3, quantity: 1 }, 3],
  ["two premium packs",                 { slotsToAdd: 3, quantity: 2 }, 6],
  ["five starter packs (1 slot each)",  { slotsToAdd: 1, quantity: 5 }, 5],
  ["legacy slotsPerMonth key",          { slotsPerMonth: 3, quantity: 2 }, 6],
  ["slotsToAdd wins over slotsPerMonth",{ slotsToAdd: 2, slotsPerMonth: 9, quantity: 3 }, 6],
]) check(`${label} -> ${want}`, slotsForCartLine(meta) === want, `got ${slotsForCartLine(meta)}`)

// ---------------------------------------------------------------------------
// Never grant zero. A missing or junk field must fall back to one slot, not
// none — a paid order that provisions nothing is the worst outcome here.
// ---------------------------------------------------------------------------
console.log("\nfalls back to 1, never 0 or negative")

for (const [label, meta, want] of [
  ["no fields at all",        {}, 1],
  ["quantity missing",        { slotsToAdd: 4 }, 4],
  ["slot count missing",      { quantity: 3 }, 3],
  ["quantity 0",              { slotsToAdd: 2, quantity: 0 }, 2],
  ["negative quantity",       { slotsToAdd: 2, quantity: -5 }, 2],
  ["negative slot count",     { slotsToAdd: -3, quantity: 2 }, 2],
  ["non-numeric quantity",    { slotsToAdd: 2, quantity: "many" }, 2],
  ["null quantity",           { slotsToAdd: 2, quantity: null }, 2],
  ["fractional quantity",     { slotsToAdd: 2, quantity: 2.9 }, 4],
  ["string numbers",          { slotsToAdd: "3", quantity: "2" }, 6],
]) check(`${label} -> ${want}`, slotsForCartLine(meta) === want, `got ${slotsForCartLine(meta)}`)

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`)
process.exit(fail === 0 ? 0 : 1)
