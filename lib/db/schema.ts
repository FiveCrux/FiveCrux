import { pgTable, text, timestamp, boolean, integer, numeric, pgEnum, json, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  image: text('image'),
  profilePicture: text('profile_picture'),
  username: text('username'),
  roles: text('roles').array().default(['user']),
  purchasedAdSlots: integer('purchased_ad_slots').default(0),
  // The seller's OWN Tebex webstore public token, saved once so they can list &
  // import their whole Tebex catalogue from their profile (Model B, per-seller).
  tebexStoreToken: text('tebex_store_token'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Categories — admin-managed browse taxonomy (dynamic). ONE source for the home
// chips, the /scripts filter, the submit-form dropdown, and category pages.
export const categories = pgTable('categories', {
  id: integer('id').primaryKey().notNull(),          // app-generated (matches prod PK style)
  name: text('name').notNull(),                      // "MLOs"
  slug: text('slug').notNull().unique(),             // "mlo" — matches script/prop `category`
  icon: text('icon'),                                // lucide icon NAME (mapped on the client)
  appliesTo: text('applies_to').notNull().default('scripts'),   // 'scripts' | 'props' | 'both'
  isActive: boolean('is_active').notNull().default(true),       // live anywhere
  showOnHome: boolean('show_on_home').notNull().default(false), // show on home chips
  homeOrder: integer('home_order').notNull().default(0),        // order on home
  sortOrder: integer('sort_order').notNull().default(0),        // order in filters
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

// Frameworks (QBCore / ESX / OX / …) — the framework filter facet, admin-managed
// and dynamic, the same way categories are.
export const frameworks = pgTable('frameworks', {
  id: integer('id').primaryKey().notNull(),          // app-generated (matches prod PK style)
  name: text('name').notNull(),                      // "QBCore" (label)
  slug: text('slug').notNull().unique(),             // "qbcore" (value used in filters)
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export type Framework = typeof frameworks.$inferSelect;
export type NewFramework = typeof frameworks.$inferInsert;

export const couponScopeEnum = pgEnum('coupon_scope', [
  'subscription',
  'prop',
  'cart',
  'Packages',
  'Categories',
  'Everything',
  'Ad Slots',
  'Featured Script Slots',
  'Props',
  'all',
]);

export const discountTypeEnum = pgEnum('discount_type', [
  'percentage',
  'flat',
  'Percentage',
  'Amount',
]);

export const itemTypeEnum = pgEnum('item_type', ['subscription', 'prop']);

export const coupons = pgTable('coupons', {
  id: integer('id').primaryKey().notNull(),
  code: text('code').notNull().unique(),
  discountType: discountTypeEnum('discount_type').notNull(),
  discountValue: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
  scope: couponScopeEnum('scope').notNull(),
  scopeIds: json('scope_ids'),
  minCartValue: numeric('min_cart_value', { precision: 10, scale: 2 }).default('0').notNull(),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').default(0).notNull(),
  perUserLimit: integer('per_user_limit').default(0).notNull(),
  couponApplicationRule: text('coupon_application_rule').default('individual').notNull(),
  username: text('username'),
  note: text('note'),
  createdBy: text('created_by').references(() => users.id),
  startDate: timestamp('start_date'),
  expiryDate: timestamp('expiry_date'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const carts = pgTable('carts', {
  id: integer('id').primaryKey().notNull(),
  userId: text('user_id').references(() => users.id),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const cartItems = pgTable('cart_items', {
  id: integer('id').primaryKey().notNull(),
  cartId: integer('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  itemType: itemTypeEnum('item_type').notNull(),
  itemId: text('item_id').notNull(),
  title: text('title').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'failed']);

export const orders = pgTable('orders', {
  id: integer('id').primaryKey().notNull(),
  userId: text('user_id').references(() => users.id),
  cartId: integer('cart_id').references(() => carts.id),
  couponId: integer('coupon_id').references(() => coupons.id),
  status: orderStatusEnum('status').default('pending'),
  totalAmount: numeric('total_amount').notNull(),
  discountAmount: numeric('discount_amount').default('0'),
  payableAmount: numeric('payable_amount').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const couponRedemptions = pgTable('coupon_redemptions', {
  id: integer('id').primaryKey().notNull(),
  couponId: integer('coupon_id').references(() => coupons.id),
  userId: text('user_id').references(() => users.id),
  orderId: integer('order_id').references(() => orders.id),
  usedAt: timestamp('used_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: integer('id').primaryKey().notNull(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  itemType: itemTypeEnum('item_type').notNull(),
  itemId: text('item_id').notNull(),
  title: text('title').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey().notNull(),
  title: text('title').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Base prop fields (common to all prop approval states)
const basePropFields = {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  discountPercentage: numeric('discount_percentage', { precision: 5, scale: 2 }).default('0'),
  discountedPrice: numeric('discounted_price', { precision: 10, scale: 2 }),
  images: text('images').array().default([]),
  zipFile: text('zip_file').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id),
  // Tebex Headless integration: prop owner's OWN webstore public token and the
  // Tebex package id that backs this prop. Nullable until the lister has linked
  // their Tebex store / package.
  tebexStoreToken: text('tebex_store_token'),
  tebexPackageId: text('tebex_package_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
};

// Pending props table (new submissions)
export const pendingProps = pgTable('pending_props', {
  ...basePropFields,
  submittedAt: timestamp('submitted_at').defaultNow(),
  adminNotes: text('admin_notes'),
});

// Approved props table (live props)
export const approvedProps = pgTable('approved_props', {
  ...basePropFields,
  approvedAt: timestamp('approved_at').defaultNow(),
  approvedBy: text('approved_by'),
  adminNotes: text('admin_notes'),
});

// Rejected props table
export const rejectedProps = pgTable('rejected_props', {
  ...basePropFields,
  rejectedAt: timestamp('rejected_at').defaultNow(),
  rejectedBy: text('rejected_by'),
  rejectionReason: text('rejection_reason').notNull(),
  adminNotes: text('admin_notes'),
});

// Backward-compatible live props export.
export const props = approvedProps;

// Base script fields (common to all script types)
const baseScriptFields = {
  id: integer('id').primaryKey().notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  price: numeric('price').notNull(),
  originalPrice: numeric('original_price'),
  currency: text('currency'),
  currencySymbol: text('currency_symbol'),
  category: text('category').notNull(),
  framework: text('framework').array().default([]),
  sellerId: text('seller_id').references(() => users.id, { onDelete: 'set null' }),
  seller_name: text('seller_name').notNull(),
  seller_email: text('seller_email').notNull(),
  features: text('features').array().default([]),
  requirements: text('requirements').array().default([]),
  link: text('link'),
  otherLinks: text('other_links').array().default([]),
  // Optional Discord invite/community link shown as a "Join Discord" button on
  // the script detail page. Nullable until the seller sets it.
  discordLink: text('discord_link'),
  images: text('images').array().default([]),
  videos: text('videos').array().default([]),
  youtubeVideoLink: text('youtube_video_link'),
  screenshots: text('screenshots').array().default([]),
  coverImage: text('cover_image'),
  featured: boolean('featured').default(false),
  free: boolean('free').default(false),
  // When true, the price is hidden everywhere (hero, cards, detail) — the seller
  // wants buyers to see the price on their own store instead. Default: show it.
  hidePrice: boolean('hide_price').default(false),
  // Tebex Headless integration: seller's OWN webstore public token and the
  // Tebex package id that backs this product. Nullable until the seller has
  // linked their Tebex store / package.
  tebexStoreToken: text('tebex_store_token'),
  tebexPackageId: text('tebex_package_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}

// Pending scripts table (new submissions)
export const pendingScripts = pgTable('pending_scripts', {
  ...baseScriptFields,
  submittedAt: timestamp('submitted_at').defaultNow(),
  adminNotes: text('admin_notes'),
});

// Approved scripts table (live scripts)
export const approvedScripts = pgTable('approved_scripts', {
  ...baseScriptFields,
  approvedAt: timestamp('approved_at').defaultNow(),
  approvedBy: text('approved_by'),
  adminNotes: text('admin_notes'),
});

// Rejected scripts table
export const rejectedScripts = pgTable('rejected_scripts', {
  ...baseScriptFields,
  rejectedAt: timestamp('rejected_at').defaultNow(),
  rejectedBy: text('rejected_by'),
  rejectionReason: text('rejection_reason').notNull(),
  adminNotes: text('admin_notes'),
});

// Legacy scripts table removed - all scripts go to pending_scripts now

// Base giveaway fields (common to all giveaway types)
const baseGiveawayFields = {
  id: integer('id').primaryKey().notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  totalValue: text('total_value').notNull(),
  currency: text('currency'),
  currencySymbol: text('currency_symbol'),
  endDate: text('end_date').notNull(),
  // startDate: text('start_date'),
  maxEntries: integer('max_entries'),
  featured: boolean('featured').default(false),
  autoAnnounce: boolean('auto_announce').default(true),
  creatorName: text('creator_name').notNull(),
  creatorEmail: text('creator_email').notNull(),
  creatorId: text('creator_id'),
  images: text('images').array().default([]),
  videos: text('videos').array().default([]),
  youtubeVideoLink: text('youtube_video_link'),
  coverImage: text('cover_image'),
  tags: text('tags').array().default([]),
  rules: text('rules').array().default([]),
  status: text('status').default('active'),
  entriesCount: integer('entries_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
};

// Pending giveaways table (new submissions)
export const pendingGiveaways = pgTable('pending_giveaways', {
  ...baseGiveawayFields,
  submittedAt: timestamp('submitted_at').defaultNow(),
  adminNotes: text('admin_notes'),
});

// Approved giveaways table (live giveaways)
export const approvedGiveaways = pgTable('approved_giveaways', {
  ...baseGiveawayFields,
  approvedAt: timestamp('approved_at').defaultNow(),
  approvedBy: text('approved_by'),
  adminNotes: text('admin_notes'),
});

// Rejected giveaways table
export const rejectedGiveaways = pgTable('rejected_giveaways', {
  ...baseGiveawayFields,
  rejectedAt: timestamp('rejected_at').defaultNow(),
  rejectedBy: text('rejected_by'),
  rejectionReason: text('rejection_reason').notNull(),
  adminNotes: text('admin_notes'),
});

// Legacy giveaways table removed - all giveaways use approval system tables

// Giveaway requirements table
export const giveawayRequirements = pgTable('giveaway_requirements', {
  id: integer('id').primaryKey().notNull(),
  giveawayId: integer('giveaway_id').notNull(),
  type: text('type').notNull(),
  description: text('description').notNull(),
  points: integer('points').notNull(),
  required: boolean('required').default(true),
  link: text('link'),
});

// Giveaway prizes table
export const giveawayPrizes = pgTable('giveaway_prizes', {
  id: integer('id').primaryKey().notNull(),
  giveawayId: integer('giveaway_id').notNull(),
  position: integer('position').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  value: text('value').notNull(),
  numberOfWinners: integer('number_of_winners').default(1).notNull(),
  winnerName: text('winner_name'), // Deprecated - kept for backward compatibility
  winnerEmail: text('winner_email'), // Deprecated - kept for backward compatibility
  claimed: boolean('claimed').default(false),
});

// Giveaway prize winners table (stores multiple winners per prize)
export const giveawayPrizeWinners = pgTable('giveaway_prize_winners', {
  id: integer('id').primaryKey().notNull(),
  prizeId: integer('prize_id').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name'),
  userEmail: text('user_email'),
  // `claimed` doubles as the creator's "Delivered" flag (delivery tracker,
  // anti-double-claim). `deliveredAt` records WHEN it was marked delivered and
  // `notes` is the creator's free-text note (what/how the prize was handed over).
  claimed: boolean('claimed').default(false),
  deliveredAt: timestamp('delivered_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Giveaway entries table
export const giveawayEntries = pgTable('giveaway_entries', {
  id: integer('id').primaryKey().notNull(),
  giveawayId: integer('giveaway_id').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name'),
  userEmail: text('user_email'),
  entryDate: timestamp('entry_date').defaultNow(),
  status: text('status').default('active'),
  pointsEarned: integer('points_earned').default(0),
  requirementsCompleted: text('requirements_completed').array().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


// Old ads table removed - using new approval system with pending_ads, approved_ads, rejected_ads

// Base ad fields for approval system
const baseAdFields = {
  id: integer('id').primaryKey().notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  imageUrl: text('image_url'),
  linkUrl: text('link_url'),
  category: text('category').notNull(),
  slotUniqueId: text('slot_unique_id'), // Unique ID to identify which slot this ad belongs to
  slotStatus: text('slot_status').default('active').notNull(), // 'active' when endDate > current date, 'inactive' when current date passes endDate
  startDate: timestamp('start_date').defaultNow(),
  endDate: timestamp('end_date'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
} as const;

// Pending ads (submissions waiting for review)
export const pendingAds = pgTable('pending_ads', {
  ...baseAdFields,
  adminNotes: text('admin_notes'),
});

// Approved ads (live)
export const approvedAds = pgTable('approved_ads', {
  ...baseAdFields,
  status: text('status').default('active'),
  approvedAt: timestamp('approved_at').defaultNow(),
  approvedBy: text('approved_by'),
  adminNotes: text('admin_notes'),
  clickCount: integer('click_count').default(0).notNull(), // Track number of clicks on the ad
  viewCount: integer('view_count').default(0).notNull(), // Track number of times ad was viewed/displayed
});

// Rejected ads
export const rejectedAds = pgTable('rejected_ads', {
  ...baseAdFields,  
  rejectedAt: timestamp('rejected_at').defaultNow(),
  rejectedBy: text('rejected_by'),
  rejectionReason: text('rejection_reason').notNull(),
  adminNotes: text('admin_notes'),
});

// User Ad Slots table (one-time purchase, not subscription)
export const userAdSlots = pgTable('user_ad_slots', {
  id: integer('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slotNumber: integer('slot_number').array().notNull(), // Array of sequential slot numbers [1, 2, 3, ...]
  slotUniqueIds: text('slot_unique_ids').array().default([]), // Array of unique IDs for each slot
  purchaseDate: timestamp('purchase_date').defaultNow().notNull(),
  endDate: timestamp('end_date'), // When this slot expires (calculated as purchaseDate + durationMonths: 1, 3, 6, or 12 months)
  packageId: text('package_id'), // Package type: 'starter', 'premium', or 'executive'
  durationMonths: integer('duration_months'), // Duration: 1, 3, 6, or 12 months
  paypalOrderId: text('paypal_order_id'), // order/payment reference id (matches prod column)
  status: text('status').default('active').notNull(), // 'active' | 'inactive'
});

// Featured scripts table (no approval needed - users can only feature approved scripts)
export const featuredScripts = pgTable('featured_scripts', {
  id: integer('id').primaryKey().notNull(),
  scriptId: integer('script_id').notNull().references(() => approvedScripts.id, { onDelete: 'cascade' }), // Reference to the script being featured
  featuredSlotUniqueId: text('featured_slot_unique_id'), // Unique ID to identify which featured script slot this belongs to
  featuredSlotStatus: text('featured_slot_status').default('active').notNull(), // 'active' when endDate > current date, 'inactive' when current date passes endDate
  featuredStartDate: timestamp('featured_start_date').defaultNow(),
  featuredEndDate: timestamp('featured_end_date'),
  featuredCreatedBy: text('featured_created_by').notNull(),
  featuredStatus: text('featured_status').default('active').notNull(), // 'active' | 'inactive'
  featuredClickCount: integer('featured_click_count').default(0).notNull(), // Track number of clicks on the featured script
  featuredViewCount: integer('featured_view_count').default(0).notNull(), // Track number of times featured script was viewed/displayed
  featuredCreatedAt: timestamp('featured_created_at').defaultNow(),
  featuredUpdatedAt: timestamp('featured_updated_at').defaultNow(),
});

// User Featured Script Slots table (one-time purchase, not subscription)
export const userFeaturedScriptSlots = pgTable('user_featured_script_slots', {
  id: integer('id').primaryKey().notNull(),
  featuredUserId: text('featured_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  featuredSlotNumber: integer('featured_slot_number').array().notNull(), // Array of sequential slot numbers [1, 2, 3, ...]
  featuredSlotUniqueIds: text('featured_slot_unique_ids').array().default([]), // Array of unique IDs for each slot
  featuredPurchaseDate: timestamp('featured_purchase_date').defaultNow().notNull(),
  featuredSlotEndDate: timestamp('featured_slot_end_date'), // When this slot expires (calculated as purchaseDate + durationWeeks: 1, 2, 4, or 8 weeks)
  featuredPackageId: text('featured_package_id'), // Package type: 'starter', 'premium', or 'executive'
  featuredDurationWeeks: integer('featured_duration_weeks'), // Duration in weeks: 1, 2, 4, or 8 weeks
  featuredPaypalOrderId: text('featured_paypal_order_id'), // order/payment reference id (matches prod column)
  featuredSlotStatus: text('featured_slot_status').default('active').notNull(), // 'active' | 'inactive'
});

// ── Side banner ad slots ───────────────────────────────────────────────
// SCARCE inventory: exactly 2 positions ('left' + 'right') shown on every page.
// Unlike userAdSlots (unlimited), only ONE live booking may exist per position
// at a time — enforced by the partial unique index below (the hard overselling
// lock: even with simultaneous purchases, the DB lets only one win).
//
// Lifecycle: reserved (15-min hold at checkout) → active (Tebex paid) → expired
// (hold lapsed OR endDate passed) / cancelled. Stale 'reserved'/'active' rows are
// swept to 'expired' before each availability check / reservation.
export const sideBannerBookings = pgTable('side_banner_bookings', {
  id: integer('id').primaryKey().notNull(),                 // app-generated (matches prod PK style)
  position: text('position').notNull(),                     // 'left-top' | 'left-bottom' | 'right-top' | 'right-bottom'
  status: text('status').notNull().default('reserved'),     // 'reserved' | 'active' | 'expired' | 'cancelled'
  title: text('title'),                                     // banner title / alt text
  imageUrl: text('image_url'),                              // banner image
  linkUrl: text('link_url'),                                // click-through URL
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  durationWeeks: integer('duration_weeks'),                 // 1 | 2 | 4
  reservedUntil: timestamp('reserved_until'),               // hold expiry while 'reserved'
  startDate: timestamp('start_date'),                       // when it went 'active'
  endDate: timestamp('end_date'),                           // when 'active' expires
  orderReference: text('order_reference'),                  // Tebex order/basket reference
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  // THE overselling lock: at most one reserved/active booking per position.
  oneLivePerPosition: uniqueIndex('side_banner_one_live_per_position')
    .on(t.position)
    .where(sql`status in ('reserved','active')`),
}));
export type SideBannerBooking = typeof sideBannerBookings.$inferSelect;
export type NewSideBannerBooking = typeof sideBannerBookings.$inferInsert;

// ── Verified-creator verification requests ─────────────────────────────
// A creator applies for the "verified" badge; an admin approves (grants the
// verified_creator role) or rejects with a reason. Mirrors the script/giveaway
// pending→approved/rejected review pattern.
export const verificationRequests = pgTable('verification_requests', {
  id: integer('id').primaryKey().notNull(),                 // app-generated
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason'),                                   // "why / about you"
  links: text('links'),                                     // portfolio / store links
  discord: text('discord'),                                 // contact handle
  status: text('status').notNull().default('pending'),      // 'pending' | 'approved' | 'rejected'
  adminReason: text('admin_reason'),                        // reject reason / review note
  reviewedBy: text('reviewed_by'),                          // admin user id
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type NewVerificationRequest = typeof verificationRequests.$inferInsert;

// Tebex orders table.
// Records every basket we create against a Tebex webstore (a seller's store for
// product purchases, or FiveCrux's own store for platform fees) so we can
// reconcile the order when the matching Tebex webhook arrives.
export const tebexOrders = pgTable('tebex_orders', {
  id: text('id').primaryKey().notNull(),
  basketIdent: text('basket_ident').notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  // 'seller_product' for a seller's webstore purchase, 'platform_fee' for
  // FiveCrux's own store (ad slots, featured-script slots).
  kind: text('kind').notNull(),
  storeToken: text('store_token').notNull(),
  // Tebex package ids included in this basket.
  packageIds: json('package_ids'),
  // 'pending' | 'completed' | 'declined' | 'refunded'
  status: text('status').default('pending').notNull(),
  tebexTransactionId: text('tebex_transaction_id'),
  amount: numeric('amount', { precision: 10, scale: 2 }),
  custom: json('custom'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const tebexOrdersRelations = relations(tebexOrders, ({ one }) => ({
  user: one(users, {
    fields: [tebexOrders.userId],
    references: [users.id],
  }),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  giveawayEntries: many(giveawayEntries),
  adSlots: many(userAdSlots),
  featuredScriptSlots: many(userFeaturedScriptSlots),
  carts: many(carts),
  orders: many(orders),
  props: many(approvedProps),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  items: many(cartItems),
  orders: many(orders),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  cart: one(carts, {
    fields: [orders.cartId],
    references: [carts.id],
  }),
  coupon: one(coupons, {
    fields: [orders.couponId],
    references: [coupons.id],
  }),
  items: many(orderItems),
  redemptions: many(couponRedemptions),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponRedemptions.couponId],
    references: [coupons.id],
  }),
  user: one(users, {
    fields: [couponRedemptions.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [couponRedemptions.orderId],
    references: [orders.id],
  }),
}));

export const userAdSlotsRelations = relations(userAdSlots, ({ one }) => ({
  user: one(users, {
    fields: [userAdSlots.userId],
    references: [users.id],
  }),
}));

export const userFeaturedScriptSlotsRelations = relations(userFeaturedScriptSlots, ({ one }) => ({
  user: one(users, {
    fields: [userFeaturedScriptSlots.featuredUserId],
    references: [users.id],
  }),
}));

// Scripts relations moved to approvedScripts
export const approvedScriptsRelations = relations(approvedScripts, ({ many }) => ({
  featuredScripts: many(featuredScripts), // One approved script can have many featured entries
}));

// Featured scripts relations
export const featuredScriptsRelations = relations(featuredScripts, ({ one }) => ({
  script: one(approvedScripts, {
    fields: [featuredScripts.scriptId],
    references: [approvedScripts.id],
  }),
}));

// Relations for approved giveaways (primary giveaway table)
export const approvedGiveawaysRelations = relations(approvedGiveaways, ({ many }) => ({
  entries: many(giveawayEntries),
  requirements: many(giveawayRequirements),
  prizes: many(giveawayPrizes),
}));

export const giveawayEntriesRelations = relations(giveawayEntries, ({ one }) => ({
  giveaway: one(approvedGiveaways, {
    fields: [giveawayEntries.giveawayId],
    references: [approvedGiveaways.id],
  }),
  user: one(users, {
    fields: [giveawayEntries.userId],
    references: [users.id],
  }),
}));


// Note: Requirements and prizes can reference giveaways from any approval table (pending, approved, rejected)
// The foreign key relationship is handled at the application level rather than database level
// to allow flexibility across multiple giveaway tables
export const giveawayRequirementsRelations = relations(giveawayRequirements, ({ one }) => ({
  // No direct foreign key relation - handled by application logic
}));

export const giveawayPrizesRelations = relations(giveawayPrizes, ({ one, many }) => ({
  // No direct foreign key relation - handled by application logic
  winners: many(giveawayPrizeWinners),
}));

export const giveawayPrizeWinnersRelations = relations(giveawayPrizeWinners, ({ one }) => ({
  // No direct foreign key relation - handled by application logic
}));

export const approvedPropsRelations = relations(approvedProps, ({ one }) => ({
  user: one(users, {
    fields: [approvedProps.createdBy],
    references: [users.id],
  }),
}));

export const pendingPropsRelations = relations(pendingProps, ({ one }) => ({
  user: one(users, {
    fields: [pendingProps.createdBy],
    references: [users.id],
  }),
}));

export const rejectedPropsRelations = relations(rejectedProps, ({ one }) => ({
  user: one(users, {
    fields: [rejectedProps.createdBy],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Script = typeof approvedScripts.$inferSelect;
export type NewScript = typeof approvedScripts.$inferInsert;
export type Giveaway = typeof approvedGiveaways.$inferSelect;
export type NewGiveaway = typeof approvedGiveaways.$inferInsert;
export type GiveawayRequirement = typeof giveawayRequirements.$inferSelect;
export type NewGiveawayRequirement = typeof giveawayRequirements.$inferInsert;
export type GiveawayPrize = typeof giveawayPrizes.$inferSelect;
export type NewGiveawayPrize = typeof giveawayPrizes.$inferInsert;
export type GiveawayPrizeWinner = typeof giveawayPrizeWinners.$inferSelect;
export type NewGiveawayPrizeWinner = typeof giveawayPrizeWinners.$inferInsert;
export type GiveawayEntry = typeof giveawayEntries.$inferSelect;
export type NewGiveawayEntry = typeof giveawayEntries.$inferInsert;
export type Ad = typeof approvedAds.$inferSelect;
export type NewAd = typeof approvedAds.$inferInsert;
export type PendingAd = typeof pendingAds.$inferSelect;
export type NewPendingAd = typeof pendingAds.$inferInsert;
export type UserAdSlot = typeof userAdSlots.$inferSelect;
export type NewUserAdSlot = typeof userAdSlots.$inferInsert;
export type FeaturedScript = typeof featuredScripts.$inferSelect;
export type NewFeaturedScript = typeof featuredScripts.$inferInsert;
export type UserFeaturedScriptSlot = typeof userFeaturedScriptSlots.$inferSelect;
export type NewUserFeaturedScriptSlot = typeof userFeaturedScriptSlots.$inferInsert;
export type Prop = typeof approvedProps.$inferSelect;
export type NewProp = typeof approvedProps.$inferInsert;
export type PendingProp = typeof pendingProps.$inferSelect;
export type NewPendingProp = typeof pendingProps.$inferInsert;
export type TebexOrder = typeof tebexOrders.$inferSelect;
export type NewTebexOrder = typeof tebexOrders.$inferInsert;
