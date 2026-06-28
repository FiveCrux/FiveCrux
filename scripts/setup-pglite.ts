/**
 * TODO: remove before production — one-shot local DB bootstrap.
 *
 * Builds a fully-seeded in-process Postgres (PGlite) at ./.pglite so the whole
 * app can be tested end-to-end with no real DB:
 *   1. applies the drizzle migrations (drizzle/*.sql via the journal)
 *   2. seeds dev users, live + pending products (scripts/props/giveaways/ads),
 *      a coupon, and giveaway requirements/prizes.
 *
 * Run BEFORE starting the dev server (the server opens the same ./.pglite):
 *   npm run db:setup-local         (added to package.json)
 *   # or: USE_PGLITE=true npx tsx scripts/setup-pglite.ts
 *
 * Safe to re-run: every seed insert uses onConflictDoNothing/Update.
 */
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import * as schema from "../lib/db/schema"
import { DEV_USERS } from "../lib/dev-auth"

const DATA_DIR = process.env.PGLITE_DIR || "./.pglite"

async function main() {
  const client = new PGlite(DATA_DIR)
  const db = drizzle(client, { schema })

  console.log(`→ migrating ${DATA_DIR} …`)
  await migrate(db, { migrationsFolder: "./drizzle" })
  console.log("✓ migrations applied")

  // ---- Users ----------------------------------------------------------------
  const users = Object.values(DEV_USERS)
  for (const u of users) {
    await db
      .insert(schema.users)
      .values({ id: u.id, name: u.name, email: u.email, username: u.username, roles: u.roles })
      .onConflictDoUpdate({ target: schema.users.id, set: { roles: u.roles, name: u.name, email: u.email, username: u.username } })
  }
  console.log(`✓ ${users.length} dev users`)

  const seller = { id: "dev-creator", name: "CruxDev", email: "creator@fivecrux.local" }
  const imgs = [
    "1542751371-adc38448a05e",
    "1538481199705-c710c4e965fc",
    "1511512578047-dfb367046420",
    "1614680376573-df3480f0c6ff",
  ].map((s) => `https://images.unsplash.com/photo-${s}?auto=format&fit=crop&w=1200&q=80`)

  // ---- Approved scripts (live marketplace) ----------------------------------
  const approvedScripts: (typeof schema.approvedScripts.$inferInsert)[] = [
    {
      id: 1001, title: "Advanced Banking System", description: "Full-featured banking with ATMs, transfers, loans and a sleek NUI. Optimised, escrow-free, regularly updated.",
      price: "24.99", originalPrice: "39.99", currency: "EUR", currencySymbol: "€", category: "Scripts",
      framework: ["ESX", "QBCore"], sellerId: seller.id, seller_name: seller.name, seller_email: seller.email,
      features: ["ATM system", "Player-to-player transfers", "Loans & interest", "Admin dashboard"],
      requirements: ["oxmysql", "es_extended"], images: imgs, screenshots: imgs, coverImage: imgs[0],
      featured: true, free: false,
      // One product wired to a Tebex package so the on-site Buy → basket flow is testable.
      tebexStoreToken: "tbx-demo-store-token", tebexPackageId: "123456",
    },
    {
      id: 1002, title: "Drug Selling System", description: "Dynamic drug economy with zones, NPC dealers, police alerts and configurable pricing.",
      price: "19.99", currency: "EUR", currencySymbol: "€", category: "Scripts",
      framework: ["QBCore"], sellerId: seller.id, seller_name: seller.name, seller_email: seller.email,
      features: ["Dynamic pricing", "Police integration", "Configurable zones"], requirements: ["qb-core"],
      images: [imgs[1]], screenshots: [imgs[1], imgs[2]], coverImage: imgs[1], featured: true, free: false,
      // Demo the "hide price" toggle — price hidden on hero/cards/detail.
      hidePrice: true,
    },
    {
      id: 1003, title: "Free HUD Starter", description: "Clean, lightweight HUD with health/armor/hunger/thirst. A great free starting point.",
      price: "0", currency: "EUR", currencySymbol: "€", category: "Scripts",
      framework: ["Standalone"], sellerId: seller.id, seller_name: seller.name, seller_email: seller.email,
      features: ["Lightweight", "Customisable", "Standalone"], requirements: [], images: [imgs[2]],
      coverImage: imgs[2], featured: false, free: true,
    },
    {
      id: 1004, title: "Mechanic Job Pro", description: "Complete mechanic job: repairs, tuning, towing, billing and a garage management UI.",
      price: "29.99", originalPrice: "44.99", currency: "EUR", currencySymbol: "€", category: "Scripts",
      framework: ["ESX", "QBCore"], sellerId: seller.id, seller_name: seller.name, seller_email: seller.email,
      features: ["Repairs & tuning", "Towing", "Billing"], requirements: ["oxmysql"], images: [imgs[3]],
      coverImage: imgs[3], featured: false, free: false,
    },
  ]
  for (const s of approvedScripts) {
    await db.insert(schema.approvedScripts).values(s).onConflictDoNothing()
  }
  console.log(`✓ ${approvedScripts.length} approved scripts`)

  // ---- Pending scripts (admin approval queue) -------------------------------
  const pendingScripts: (typeof schema.pendingScripts.$inferInsert)[] = [
    {
      id: 2001, title: "Casino Heist [PENDING]", description: "Multi-stage casino heist with hacking minigames and dynamic loot.",
      price: "34.99", currency: "EUR", currencySymbol: "€", category: "Scripts", framework: ["QBCore"],
      sellerId: seller.id, seller_name: seller.name, seller_email: seller.email, features: ["Minigames", "Dynamic loot"],
      requirements: ["qb-core"], images: [imgs[0]], coverImage: imgs[0], adminNotes: null,
    },
    {
      id: 2002, title: "Fishing & Boating [PENDING]", description: "Relaxing fishing economy with rare catches, rods and a boat shop.",
      price: "14.99", currency: "EUR", currencySymbol: "€", category: "Scripts", framework: ["ESX"],
      sellerId: seller.id, seller_name: seller.name, seller_email: seller.email, features: ["Rare catches", "Boat shop"],
      requirements: ["es_extended"], images: [imgs[1]], coverImage: imgs[1], adminNotes: null,
    },
  ]
  for (const s of pendingScripts) {
    await db.insert(schema.pendingScripts).values(s).onConflictDoNothing()
  }
  console.log(`✓ ${pendingScripts.length} pending scripts (approval queue)`)

  // ---- Approved props (MLOs / vehicles / clothing) --------------------------
  const approvedProps: (typeof schema.approvedProps.$inferInsert)[] = [
    {
      id: "prop-1001", name: "Luxury Apartments MLO", description: "High-end interior MLO with multiple furnished units, garage and rooftop.",
      price: "34.99", discountPercentage: "15", discountedPrice: "29.74", images: imgs, zipFile: "luxury-apartments.zip",
      createdBy: seller.id, tebexStoreToken: "tbx-demo-store-token", tebexPackageId: "654321",
    },
    {
      id: "prop-1002", name: "Police Station MLO", description: "Detailed PD interior with cells, armory, briefing room and parking.",
      price: "27.99", images: [imgs[1], imgs[2]], zipFile: "police-mlo.zip", createdBy: seller.id,
    },
    {
      id: "prop-1003", name: "Sports Car Pack (5)", description: "Five optimised add-on vehicles with tuning, liveries and templates.",
      price: "19.99", discountPercentage: "0", images: [imgs[3]], zipFile: "sportscar-pack.zip", createdBy: seller.id,
    },
  ]
  for (const p of approvedProps) {
    await db.insert(schema.approvedProps).values(p).onConflictDoNothing()
  }
  console.log(`✓ ${approvedProps.length} approved props`)

  // ---- Pending prop ---------------------------------------------------------
  await db.insert(schema.pendingProps).values({
    id: "prop-2001", name: "Beach House MLO [PENDING]", description: "Modern beachfront villa interior with pool and dock.",
    price: "22.99", images: [imgs[0]], zipFile: "beach-house.zip", createdBy: seller.id,
  }).onConflictDoNothing()
  console.log("✓ 1 pending prop")

  // ---- Approved giveaways + requirements + prizes ---------------------------
  const giveaways: (typeof schema.approvedGiveaways.$inferInsert)[] = [
    {
      id: 3001, title: "€500 Script Bundle Giveaway", description: "Win our entire premium script catalogue — winner gets every paid script free for life.",
      totalValue: "500", currency: "EUR", currencySymbol: "€", endDate: "2026-12-31T23:59:59.000Z", maxEntries: 5000,
      featured: true, autoAnnounce: true, creatorName: "FiveCrux", creatorEmail: "team@fivecrux.local", creatorId: "dev-admin",
      images: [imgs[0]], coverImage: imgs[0], tags: ["scripts", "bundle"], rules: ["Must be 16+", "One entry per person"],
      status: "active", entriesCount: 0,
    },
    {
      id: 3002, title: "Gaming PC Giveaway", description: "RTX-powered gaming rig for the community. Enter by completing the tasks below.",
      totalValue: "1500", currency: "EUR", currencySymbol: "€", endDate: "2026-09-30T23:59:59.000Z", maxEntries: 10000,
      featured: false, autoAnnounce: true, creatorName: "FiveCrux", creatorEmail: "team@fivecrux.local", creatorId: "dev-admin",
      images: [imgs[3]], coverImage: imgs[3], tags: ["hardware"], rules: ["Worldwide"], status: "active", entriesCount: 0,
    },
  ]
  for (const g of giveaways) {
    await db.insert(schema.approvedGiveaways).values(g).onConflictDoNothing()
  }
  await db.insert(schema.giveawayRequirements).values([
    { id: 4001, giveawayId: 3001, type: "discord", description: "Join our Discord server", points: 10, required: true, link: "https://discord.gg/fivecrux" },
    { id: 4002, giveawayId: 3001, type: "youtube", description: "Subscribe on YouTube", points: 5, required: false, link: "https://youtube.com/@fivecrux" },
    { id: 4003, giveawayId: 3002, type: "discord", description: "Join our Discord server", points: 10, required: true, link: "https://discord.gg/fivecrux" },
  ]).onConflictDoNothing()
  await db.insert(schema.giveawayPrizes).values([
    { id: 5001, giveawayId: 3001, position: 1, name: "Full Script Catalogue", description: "Every paid script, free for life", value: "500", numberOfWinners: 1 },
    { id: 5002, giveawayId: 3002, position: 1, name: "RTX Gaming PC", description: "Pre-built gaming rig", value: "1500", numberOfWinners: 1 },
  ]).onConflictDoNothing()
  console.log(`✓ ${giveaways.length} approved giveaways (+ requirements + prizes)`)

  // ---- Pending giveaway -----------------------------------------------------
  await db.insert(schema.pendingGiveaways).values({
    id: 3003, title: "Steam Gift Cards [PENDING]", description: "Three €50 Steam gift cards for active community members.",
    totalValue: "150", currency: "EUR", currencySymbol: "€", endDate: "2026-10-15T23:59:59.000Z", maxEntries: 2000,
    featured: false, creatorName: "CruxDev", creatorEmail: seller.email, creatorId: seller.id, images: [imgs[2]],
    coverImage: imgs[2], tags: ["steam"], rules: ["Active members only"], status: "pending",
  }).onConflictDoNothing()
  console.log("✓ 1 pending giveaway")

  // ---- Approved ads ---------------------------------------------------------
  await db.insert(schema.approvedAds).values([
    { id: 6001, title: "Premium Script Store", description: "Browse 200+ optimised FiveM scripts", imageUrl: imgs[0], linkUrl: "https://fivecrux.local", category: "Scripts", createdBy: "dev-admin", status: "active", slotStatus: "active" },
    { id: 6002, title: "MLO Mega Pack", description: "50 interiors in one bundle", imageUrl: imgs[1], linkUrl: "https://fivecrux.local", category: "Props", createdBy: "dev-admin", status: "active", slotStatus: "active" },
  ]).onConflictDoNothing()
  console.log("✓ 2 approved ads")

  // ---- Pending ad -----------------------------------------------------------
  await db.insert(schema.pendingAds).values({
    id: 6003, title: "Server Hosting Deal [PENDING]", description: "20% off FiveM server hosting", imageUrl: imgs[3], linkUrl: "https://host.local", category: "Scripts", createdBy: seller.id, slotStatus: "active",
  }).onConflictDoNothing()
  console.log("✓ 1 pending ad")

  // ---- Side banner (demo) ---------------------------------------------------
  // LEFT slot = sold + live (owned by CruxDev) so the rail shows a real banner;
  // RIGHT slot stays open so the buy flow is demoable. Log in as CruxDev (creator)
  // to manage/edit the left banner from Profile → Side Banners.
  await db.insert(schema.sideBannerBookings).values({
    id: 10001,
    position: "left",
    status: "active",
    title: "Advanced Banking — 20% off",
    imageUrl: imgs[0],
    linkUrl: "https://fivecrux.local",
    createdBy: seller.id, // dev-creator (CruxDev)
    durationWeeks: 2,
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    orderReference: "demo-seed",
  }).onConflictDoNothing()
  console.log("✓ 1 active side banner (left, demo)")

  // ---- Coupon ---------------------------------------------------------------
  await db.insert(schema.coupons).values({
    id: 7001, code: "CRUX10", discountType: "percentage", discountValue: "10", scope: "all",
    minCartValue: "0", usedCount: 0, perUserLimit: 0, couponApplicationRule: "individual",
    createdBy: "dev-admin", isActive: true,
  }).onConflictDoNothing()
  console.log("✓ 1 coupon (CRUX10 — 10% off)")

  // ---- Browse categories (dynamic, admin-managed) ---------------------------
  await db.insert(schema.categories).values([
    { id: 8001, name: "MLOs", slug: "mlo", icon: "Building2", appliesTo: "scripts", isActive: true, showOnHome: true, homeOrder: 1, sortOrder: 1 },
    { id: 8002, name: "Vehicles", slug: "vehicles", icon: "Car", appliesTo: "scripts", isActive: true, showOnHome: true, homeOrder: 2, sortOrder: 2 },
    { id: 8003, name: "Weapons", slug: "weapons", icon: "Crosshair", appliesTo: "scripts", isActive: true, showOnHome: true, homeOrder: 3, sortOrder: 3 },
    { id: 8004, name: "Clothing", slug: "clothing", icon: "Shirt", appliesTo: "both", isActive: true, showOnHome: true, homeOrder: 4, sortOrder: 4 },
    { id: 8005, name: "Maps", slug: "maps", icon: "Map", appliesTo: "scripts", isActive: true, showOnHome: true, homeOrder: 5, sortOrder: 5 },
    { id: 8006, name: "Economy", slug: "economy", icon: "Coins", appliesTo: "scripts", isActive: true, showOnHome: true, homeOrder: 6, sortOrder: 6 },
  ]).onConflictDoNothing()
  console.log("✓ 6 browse categories")

  // ---- Frameworks (dynamic, admin-managed) ----------------------------------
  await db.insert(schema.frameworks).values([
    { id: 9001, name: "QBCore", slug: "qbcore", isActive: true, sortOrder: 1 },
    { id: 9002, name: "Qbox", slug: "qbox", isActive: true, sortOrder: 2 },
    { id: 9003, name: "ESX", slug: "esx", isActive: true, sortOrder: 3 },
    { id: 9004, name: "OX", slug: "ox", isActive: true, sortOrder: 4 },
    { id: 9005, name: "VRP", slug: "vrp", isActive: true, sortOrder: 5 },
    { id: 9006, name: "Standalone", slug: "standalone", isActive: true, sortOrder: 6 },
  ]).onConflictDoNothing()
  console.log("✓ 6 frameworks")

  await client.close()
  console.log("\n✅ Local PGlite DB ready. Start the app with USE_PGLITE=true.")
}

main().catch((e) => {
  console.error("✗ setup-pglite failed:", e)
  process.exit(1)
})
