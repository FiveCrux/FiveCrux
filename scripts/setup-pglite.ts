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
import { DEV_USERS } from "../lib/dev-users"

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

  // ---- Approved scripts (live marketplace) -----------------------------------
  // `category` must be a real category SLUG (mlo/vehicles/weapons/clothing/
  // economy) — the submit form populates it from the categories table, and
  // category-browse pages filter by exact slug match. One script per category
  // so every nav/category page has something to show.
  const approvedScripts: (typeof schema.approvedScripts.$inferInsert)[] = [
    {
      id: 1001, title: "Advanced Banking System", description: "Full-featured banking with ATMs, transfers, loans and a sleek NUI. Optimised, escrow-free, regularly updated.",
      price: "24.99", originalPrice: "39.99", currency: "EUR", currencySymbol: "€", category: "economy",
      framework: ["ESX", "QBCore"], sellerId: seller.id, seller_name: seller.name, seller_email: seller.email,
      features: ["ATM system", "Player-to-player transfers", "Loans & interest", "Admin dashboard"],
      requirements: ["oxmysql", "es_extended"], images: imgs, screenshots: imgs, coverImage: imgs[0],
      featured: true, free: false,
      // One product wired to a Tebex package so the on-site Buy → basket flow is testable.
      tebexStoreToken: "tbx-demo-store-token", tebexPackageId: "123456",
    },
    {
      id: 1002, title: "Drug Selling System", description: "Dynamic drug economy with zones, NPC dealers, police alerts and configurable pricing.",
      price: "19.99", currency: "EUR", currencySymbol: "€", category: "economy",
      framework: ["QBCore"], sellerId: seller.id, seller_name: seller.name, seller_email: seller.email,
      features: ["Dynamic pricing", "Police integration", "Configurable zones"], requirements: ["qb-core"],
      images: [imgs[1]], screenshots: [imgs[1], imgs[2]], coverImage: imgs[1], featured: true, free: false,
      // Demo the "hide price" toggle — price hidden on hero/cards/detail.
      hidePrice: true,
    },
    {
      id: 1003, title: "Free HUD Starter", description: "Clean, lightweight HUD with health/armor/hunger/thirst. A great free starting point.",
      price: "0", currency: "EUR", currencySymbol: "€", category: "clothing",
      framework: ["Standalone"], sellerId: seller.id, seller_name: seller.name, seller_email: seller.email,
      features: ["Lightweight", "Customisable", "Standalone"], requirements: [], images: [imgs[2]],
      coverImage: imgs[2], featured: false, free: true,
    },
    {
      id: 1004, title: "Mechanic Job Pro", description: "Complete mechanic job: repairs, tuning, towing, billing and a garage management UI.",
      price: "29.99", originalPrice: "44.99", currency: "EUR", currencySymbol: "€", category: "vehicles",
      framework: ["ESX", "QBCore"], sellerId: seller.id, seller_name: seller.name, seller_email: seller.email,
      features: ["Repairs & tuning", "Towing", "Billing"], requirements: ["oxmysql"], images: [imgs[3]],
      coverImage: imgs[3], featured: false, free: false,
    },
    {
      id: 1005, title: "Weapon Shop & Crafting", description: "Configurable weapon shops, crafting benches and a licensing system.",
      price: "17.99", currency: "EUR", currencySymbol: "€", category: "weapons",
      framework: ["QBCore", "Qbox"], sellerId: seller.id, seller_name: seller.name, seller_email: seller.email,
      features: ["Weapon shops", "Crafting", "Licensing"], requirements: ["qb-core"], images: [imgs[0]],
      coverImage: imgs[0], featured: false, free: false,
    },
    {
      id: 1006, title: "Luxury Garage MLO Manager", description: "Full garage management script paired with a custom MLO — storage, valet and customisation.",
      price: "32.99", currency: "EUR", currencySymbol: "€", category: "maps",
      framework: ["ESX", "QBCore"], sellerId: seller.id, seller_name: seller.name, seller_email: seller.email,
      features: ["Vehicle storage", "Valet service", "Customisation menu"], requirements: ["oxmysql"], images: [imgs[1]],
      coverImage: imgs[1], featured: false, free: false,
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
      price: "34.99", currency: "EUR", currencySymbol: "€", category: "economy", framework: ["QBCore"],
      sellerId: seller.id, seller_name: seller.name, seller_email: seller.email, features: ["Minigames", "Dynamic loot"],
      requirements: ["qb-core"], images: [imgs[0]], coverImage: imgs[0], adminNotes: null,
    },
    {
      id: 2002, title: "Fishing & Boating [PENDING]", description: "Relaxing fishing economy with rare catches, rods and a boat shop.",
      price: "14.99", currency: "EUR", currencySymbol: "€", category: "economy", framework: ["ESX"],
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
    { id: 6001, title: "Premium Script Store", description: "Browse 200+ optimised FiveM scripts", imageUrl: imgs[0], linkUrl: "https://fivecrux.local", category: "scripts", createdBy: "dev-admin", status: "active", slotStatus: "active" },
    { id: 6002, title: "MLO Mega Pack", description: "50 interiors in one bundle", imageUrl: imgs[1], linkUrl: "https://fivecrux.local", category: "props", createdBy: "dev-admin", status: "active", slotStatus: "active" },
  ]).onConflictDoNothing()
  console.log("✓ 2 approved ads")

  // ---- Pending ad -----------------------------------------------------------
  await db.insert(schema.pendingAds).values({
    id: 6003, title: "Server Hosting Deal [PENDING]", description: "20% off FiveM server hosting", imageUrl: imgs[3], linkUrl: "https://host.local", category: "scripts", createdBy: seller.id, slotStatus: "active",
  }).onConflictDoNothing()
  console.log("✓ 1 pending ad")

  // ---- Side banners (demo) ---------------------------------------------------
  // All 4 sellable slots (left-top/left-bottom/right-top/right-bottom) are
  // sold + live so the rails never show an empty "Advertise here" CTA in the
  // demo. Log in as CruxDev (creator) to manage/edit these from
  // Profile → Side Banners.
  await db.insert(schema.sideBannerBookings).values([
    {
      id: 10001, position: "left-top", status: "active", title: "Advanced Banking — 20% off",
      imageUrl: imgs[0], linkUrl: "https://fivecrux.local/script/1001", createdBy: seller.id,
      durationWeeks: 2, startDate: new Date(), endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      orderReference: "demo-seed-1",
    },
    {
      id: 10002, position: "left-bottom", status: "active", title: "Luxury Garage MLO Manager",
      imageUrl: imgs[1], linkUrl: "https://fivecrux.local/script/1006", createdBy: seller.id,
      durationWeeks: 4, startDate: new Date(), endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      orderReference: "demo-seed-2",
    },
    {
      id: 10003, position: "right-top", status: "active", title: "Weapon Shop & Crafting — new release",
      imageUrl: imgs[2], linkUrl: "https://fivecrux.local/script/1005", createdBy: seller.id,
      durationWeeks: 1, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      orderReference: "demo-seed-3",
    },
    {
      id: 10004, position: "right-bottom", status: "active", title: "Mechanic Job Pro — 33% off",
      imageUrl: imgs[3], linkUrl: "https://fivecrux.local/script/1004", createdBy: seller.id,
      durationWeeks: 2, startDate: new Date(), endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      orderReference: "demo-seed-4",
    },
  ]).onConflictDoNothing()
  console.log("✓ 4 active side banners (all 4 slots sold + live)")

  // ---- Coupon ---------------------------------------------------------------
  await db.insert(schema.coupons).values({
    id: 7001, code: "CRUX10", discountType: "percentage", discountValue: "10", scope: "all",
    minCartValue: "0", usedCount: 0, perUserLimit: 0, couponApplicationRule: "individual",
    createdBy: "dev-admin", isActive: true,
  }).onConflictDoNothing()
  console.log("✓ 1 coupon (CRUX10 — 10% off)")

  // ---- Browse categories (dynamic, admin-managed) ---------------------------
  await db.insert(schema.categories).values([
    { id: 8001, name: "Maps", slug: "maps", icon: "Building2", appliesTo: "scripts", isActive: true, showOnHome: true, homeOrder: 1, sortOrder: 1 },
    { id: 8002, name: "Vehicles", slug: "vehicles", icon: "Car", appliesTo: "scripts", isActive: true, showOnHome: true, homeOrder: 2, sortOrder: 2 },
    { id: 8003, name: "Weapons", slug: "weapons", icon: "Crosshair", appliesTo: "scripts", isActive: true, showOnHome: true, homeOrder: 3, sortOrder: 3 },
    { id: 8004, name: "Clothing", slug: "clothing", icon: "Shirt", appliesTo: "both", isActive: true, showOnHome: true, homeOrder: 4, sortOrder: 4 },
    { id: 8006, name: "Economy", slug: "economy", icon: "Coins", appliesTo: "scripts", isActive: true, showOnHome: true, homeOrder: 5, sortOrder: 5 },
    // Added 2026-07-13 per Bandookchi's category spec (Discord): Script + Peds.
    { id: 8007, name: "Script", slug: "script", icon: "FileCode2", appliesTo: "scripts", isActive: true, showOnHome: true, homeOrder: 6, sortOrder: 6 },
    { id: 8008, name: "Peds", slug: "peds", icon: "PersonStanding", appliesTo: "scripts", isActive: true, showOnHome: true, homeOrder: 7, sortOrder: 7 },
    // "Other" was already a static navbar catch-all link (/scripts?category=other)
    // but had no real category row — sellers could never actually select it at
    // submission time, so it always showed an empty page. Added for real.
    { id: 8009, name: "Other", slug: "other", icon: "Tag", appliesTo: "both", isActive: true, showOnHome: false, homeOrder: 8, sortOrder: 8 },
  ]).onConflictDoNothing()
  console.log("✓ 8 browse categories")

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

  // ---- Rejected items (admin rejection-queue UI) ----------------------------
  await db.insert(schema.rejectedScripts).values({
    id: 2003, title: "Illegal Firearms Pack [REJECTED]", description: "Unlicensed weapon models bundled without permission.",
    price: "9.99", currency: "EUR", currencySymbol: "€", category: "weapons", framework: ["Standalone"],
    sellerId: seller.id, seller_name: seller.name, seller_email: seller.email, features: [], requirements: [],
    images: [imgs[0]], coverImage: imgs[0], rejectionReason: "Uses third-party assets without a redistribution license.",
  }).onConflictDoNothing()
  await db.insert(schema.rejectedProps).values({
    id: "prop-2002", name: "Copied Hospital MLO [REJECTED]", description: "Interior too closely matches an existing paid release.",
    price: "18.99", images: [imgs[1]], zipFile: "hospital-mlo.zip", createdBy: seller.id,
    rejectionReason: "Substantially similar to an existing marketplace listing.",
  }).onConflictDoNothing()
  await db.insert(schema.rejectedGiveaways).values({
    id: 3004, title: "Crypto Giveaway [REJECTED]", description: "Giveaway offering cryptocurrency as the prize.",
    totalValue: "1000", currency: "EUR", currencySymbol: "€", endDate: "2026-11-30T23:59:59.000Z", maxEntries: 1000,
    featured: false, creatorName: seller.name, creatorEmail: seller.email, creatorId: seller.id, images: [imgs[2]],
    coverImage: imgs[2], tags: ["crypto"], rules: [], status: "rejected",
    rejectionReason: "Cryptocurrency prizes aren't allowed under the giveaway policy.",
  }).onConflictDoNothing()
  await db.insert(schema.rejectedAds).values({
    id: 6004, title: "Competitor Store [REJECTED]", description: "Ad promoting a rival marketplace.",
    imageUrl: imgs[3], linkUrl: "https://rival.local", category: "scripts", createdBy: seller.id, slotStatus: "active",
    rejectionReason: "Ads may not promote a competing marketplace.",
  }).onConflictDoNothing()
  console.log("✓ 1 rejected script + 1 rejected prop + 1 rejected giveaway + 1 rejected ad")

  // ---- Purchased ad slots (dev-creator owns 2 of 3 — one used, one open) ----
  await db.insert(schema.userAdSlots).values({
    id: 11001, userId: seller.id, slotNumber: [1, 2], slotUniqueIds: ["adslot-demo-1", "adslot-demo-2"],
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), packageId: "premium", durationMonths: 3,
    paypalOrderId: "demo-ad-slot-order", status: "active",
  }).onConflictDoNothing()
  await db.insert(schema.approvedAds).values({
    id: 6005, title: "CruxDev's Banking Script Sale", description: "20% off the Advanced Banking System this week only.",
    imageUrl: imgs[0], linkUrl: "https://fivecrux.local/script/1001", category: "scripts", createdBy: seller.id,
    status: "active", slotStatus: "active", slotUniqueId: "adslot-demo-1", clickCount: 15, viewCount: 146,
  }).onConflictDoNothing()
  console.log("✓ 2 purchased ad slots for CruxDev (1 used, 1 open, 1 locked)")

  // ---- Purchased featured-script slots (same 2-of-3 pattern) ----------------
  await db.insert(schema.userFeaturedScriptSlots).values({
    id: 12001, featuredUserId: seller.id, featuredSlotNumber: [1, 2],
    featuredSlotUniqueIds: ["featslot-demo-1", "featslot-demo-2"],
    featuredSlotEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    featuredPackageId: "premium", featuredDurationWeeks: 8,
    featuredPaypalOrderId: "demo-featured-slot-order", featuredSlotStatus: "active",
  }).onConflictDoNothing()
  await db.insert(schema.featuredScripts).values({
    id: 13001, scriptId: 1002, featuredSlotUniqueId: "featslot-demo-1", featuredSlotStatus: "active",
    featuredCreatedBy: seller.id, featuredStatus: "active", featuredClickCount: 8, featuredViewCount: 210,
    featuredEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  }).onConflictDoNothing()
  console.log("✓ 2 purchased featured-script slots for CruxDev (1 used, 1 open, 1 locked)")

  // ---- Creator code (storewide referral/affiliate code) ---------------------
  await db.insert(schema.creatorCodes).values({
    code: "CRUXDEV", createdBy: seller.id, discountType: "percentage", discountValue: "5",
    commissionType: "percentage", commissionValue: "10", isActive: true, usedCount: 3,
  }).onConflictDoNothing()
  console.log("✓ 1 creator code (CRUXDEV)")

  // ---- Giveaway entries (populate the creator's Entries tab) ----------------
  await db.insert(schema.giveawayEntries).values([
    { id: 14001, giveawayId: 3001, userId: "dev-buyer", userName: "Buyer Dev", userEmail: "buyer@fivecrux.local", discordId: "111111111111111111", status: "active", pointsEarned: 15, requirementsCompleted: ["4001", "4002"] },
    { id: 14002, giveawayId: 3001, userId: "dev-vcreator", userName: "VCreator Dev", userEmail: "vcreator@fivecrux.local", discordId: "222222222222222222", status: "active", pointsEarned: 10, requirementsCompleted: ["4001"] },
    { id: 14003, giveawayId: 3002, userId: "dev-buyer", userName: "Buyer Dev", userEmail: "buyer@fivecrux.local", discordId: "111111111111111111", status: "active", pointsEarned: 10, requirementsCompleted: ["4003"] },
  ]).onConflictDoNothing()
  console.log("✓ 3 giveaway entries")

  await client.close()
  console.log("\n✅ Local PGlite DB ready. Start the app with USE_PGLITE=true.")
}

main().catch((e) => {
  console.error("✗ setup-pglite failed:", e)
  process.exit(1)
})
