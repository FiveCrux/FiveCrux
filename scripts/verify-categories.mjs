// Self-contained, in-process test of the categories table + CRUD shape.
// Uses an EPHEMERAL in-memory PGlite (no disk, no prod) so it is immune to the
// flaky cross-process persistence on this machine.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq, asc, and, inArray } from "drizzle-orm";
import * as schema from "../lib/db/schema.ts";

const client = new PGlite(); // in-memory
const db = drizzle(client, { schema });
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("✓ migrations applied (categories table created)");

const { categories } = schema;

// create
await db.insert(categories).values([
  { id: 1, name: "MLOs", slug: "mlo", icon: "Building2", appliesTo: "scripts", isActive: true, showOnHome: true, homeOrder: 1, sortOrder: 1 },
  { id: 2, name: "Vehicles", slug: "vehicles", icon: "Car", appliesTo: "scripts", isActive: true, showOnHome: false, homeOrder: 0, sortOrder: 2 },
  { id: 3, name: "Clothing", slug: "clothing", icon: "Shirt", appliesTo: "both", isActive: false, showOnHome: true, homeOrder: 2, sortOrder: 3 },
]);
console.log("✓ inserted 3 categories");

// getCategories() — active only, default scope
const active = await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder));
console.assert(active.length === 2, `expected 2 active, got ${active.length}`);
console.log(`✓ active only → ${active.map((c) => c.slug).join(", ")}`);

// home=true → active AND showOnHome
const home = await db.select().from(categories).where(and(eq(categories.isActive, true), eq(categories.showOnHome, true))).orderBy(asc(categories.homeOrder));
console.assert(home.length === 1 && home[0].slug === "mlo", `home filter wrong: ${JSON.stringify(home.map((c) => c.slug))}`);
console.log(`✓ home=true → ${home.map((c) => c.slug).join(", ")}`);

// appliesTo=props → includes 'both' (but clothing is inactive, so empty among active)
const propsCats = await db.select().from(categories).where(and(eq(categories.isActive, true), inArray(categories.appliesTo, ["props", "both"])));
console.assert(propsCats.length === 0, `props scope wrong: ${propsCats.length}`);
console.log(`✓ appliesTo=props (active+both) → ${propsCats.length} (clothing is inactive)`);

// update
await db.update(categories).set({ isActive: true, name: "Clothing & EUP" }).where(eq(categories.id, 3));
const propsCats2 = await db.select().from(categories).where(and(eq(categories.isActive, true), inArray(categories.appliesTo, ["props", "both"])));
console.assert(propsCats2.length === 1 && propsCats2[0].name === "Clothing & EUP", "update failed");
console.log("✓ update reactivated + renamed clothing");

// unique slug enforced
let dupFailed = false;
try {
  await db.insert(categories).values({ id: 99, name: "Dup", slug: "mlo" });
} catch {
  dupFailed = true;
}
console.assert(dupFailed, "duplicate slug should have failed");
console.log("✓ unique slug constraint enforced");

// delete
await db.delete(categories).where(eq(categories.id, 2));
const remaining = await db.select().from(categories);
console.assert(remaining.length === 2, `expected 2 after delete, got ${remaining.length}`);
console.log(`✓ delete → ${remaining.length} remaining`);

await client.close();
console.log("\n✅ categories table + all CRUD/filter paths verified");
