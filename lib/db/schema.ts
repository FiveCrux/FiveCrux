import { pgTable, text, timestamp, boolean, integer, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

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
  images: text('images').array().default([]),
  videos: text('videos').array().default([]),
  youtubeVideoLink: text('youtube_video_link'),
  screenshots: text('screenshots').array().default([]),
  coverImage: text('cover_image'),
  featured: boolean('featured').default(false),
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
  claimed: boolean('claimed').default(false),
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
  paypalOrderId: text('paypal_order_id'), // PayPal order ID for one-time payment
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
  featuredPaypalOrderId: text('featured_paypal_order_id'), // PayPal order ID for one-time payment
  featuredSlotStatus: text('featured_slot_status').default('active').notNull(), // 'active' | 'inactive'
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  giveawayEntries: many(giveawayEntries),
  adSlots: many(userAdSlots),
  featuredScriptSlots: many(userFeaturedScriptSlots),
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
