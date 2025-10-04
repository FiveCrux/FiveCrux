import { pgTable, text, timestamp, boolean, integer, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums - temporarily disabled to avoid migration issues
// export const userRoleEnum = pgEnum('user_role', ['founder', 'verified_creator', 'crew', 'admin', 'moderator', 'user']);
// export const scriptStatusEnum = pgEnum('script_status', ['pending', 'approved', 'rejected']);
// export const giveawayDifficultyEnum = pgEnum('giveaway_difficulty', ['Easy', 'Medium', 'Hard']);
// export const giveawayStatusEnum = pgEnum('giveaway_status', ['active', 'ended', 'cancelled']);
// export const entryStatusEnum = pgEnum('entry_status', ['active', 'disqualified', 'winner']);
// export const adStatusEnum = pgEnum('ad_status', ['active', 'inactive', 'expired']);

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  image: text('image'),
  username: text('username'),
  roles: text('roles').array().default(['user']),
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
  category: text('category').notNull(),
  framework: text('framework').array().default([]),
  sellerId: text('seller_id').references(() => users.id, { onDelete: 'set null' }),
  seller_name: text('seller_name').notNull(),
  seller_email: text('seller_email').notNull(),
  tags: text('tags').array().default([]),
  features: text('features').array().default([]),
  requirements: text('requirements').array().default([]),
  images: text('images').array().default([]),
  videos: text('videos').array().default([]),
  screenshots: text('screenshots').array().default([]),
  coverImage: text('cover_image'),
  demoUrl: text('demo_url'),
  documentationUrl: text('documentation_url'),
  supportUrl: text('support_url'),
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
  category: text('category').notNull(),
  endDate: text('end_date').notNull(),
  maxEntries: integer('max_entries'),
  difficulty: text('difficulty').notNull(),
  featured: boolean('featured').default(false),
  autoAnnounce: boolean('auto_announce').default(false),
  creatorName: text('creator_name').notNull(),
  creatorEmail: text('creator_email').notNull(),
  creatorId: text('creator_id'),
  images: text('images').array().default([]),
  videos: text('videos').array().default([]),
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

// Legacy giveaways table (for backward compatibility)
export const giveaways = pgTable('giveaways', {
  id: integer('id').primaryKey().notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  totalValue: text('total_value').notNull(),
  category: text('category').notNull(),
  endDate: text('end_date').notNull(),
  maxEntries: integer('max_entries'),
  difficulty: text('difficulty').notNull(),
  featured: boolean('featured').default(false),
  autoAnnounce: boolean('auto_announce').default(false),
  creatorName: text('creator_name').notNull(),
  creatorEmail: text('creator_email').notNull(),
  creatorId: text('creator_id'),
  images: text('images').array().default([]),
  videos: text('videos').array().default([]),
  coverImage: text('cover_image'),
  tags: text('tags').array().default([]),
  rules: text('rules').array().default([]),
  status: text('status').default('active'),
  entriesCount: integer('entries_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Giveaway requirements table
export const giveawayRequirements = pgTable('giveaway_requirements', {
  id: integer('id').primaryKey().notNull(),
  giveawayId: integer('giveaway_id').notNull().references(() => giveaways.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  description: text('description').notNull(),
  points: integer('points').notNull(),
  required: boolean('required').default(true),
  link: text('link'),
});

// Giveaway prizes table
export const giveawayPrizes = pgTable('giveaway_prizes', {
  id: integer('id').primaryKey().notNull(),
  giveawayId: integer('giveaway_id').notNull().references(() => giveaways.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  value: text('value').notNull(),
  winnerName: text('winner_name'),
  winnerEmail: text('winner_email'),
  claimed: boolean('claimed').default(false),
});

// Giveaway entries table
export const giveawayEntries = pgTable('giveaway_entries', {
  id: integer('id').primaryKey().notNull(),
  giveawayId: integer('giveaway_id').notNull().references(() => giveaways.id, { onDelete: 'cascade' }),
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
  priority: integer('priority').default(1),
  startDate: timestamp('start_date').defaultNow(),
  endDate: timestamp('end_date'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
} as const;

// Pending ads (submissions waiting for review)
export const pendingAds = pgTable('pending_ads', {
  ...baseAdFields,
  submittedAt: timestamp('submitted_at').defaultNow(),
  adminNotes: text('admin_notes'),
});

// Approved ads (live)
export const approvedAds = pgTable('approved_ads', {
  ...baseAdFields,
  status: text('status').default('active'),
  approvedAt: timestamp('approved_at').defaultNow(),
  approvedBy: text('approved_by'),
  adminNotes: text('admin_notes'),
});

// Rejected ads
export const rejectedAds = pgTable('rejected_ads', {
  ...baseAdFields,
  rejectedAt: timestamp('rejected_at').defaultNow(),
  rejectedBy: text('rejected_by'),
  rejectionReason: text('rejection_reason').notNull(),
  adminNotes: text('admin_notes'),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  giveawayEntries: many(giveawayEntries),
}));

// Scripts relations moved to approvedScripts
export const approvedScriptsRelations = relations(approvedScripts, ({ many }) => ({
}));

export const giveawaysRelations = relations(giveaways, ({ many }) => ({
  entries: many(giveawayEntries),
  requirements: many(giveawayRequirements),
  prizes: many(giveawayPrizes),
}));

export const giveawayEntriesRelations = relations(giveawayEntries, ({ one }) => ({
  giveaway: one(giveaways, {
    fields: [giveawayEntries.giveawayId],
    references: [giveaways.id],
  }),
  user: one(users, {
    fields: [giveawayEntries.userId],
    references: [users.id],
  }),
}));


export const giveawayRequirementsRelations = relations(giveawayRequirements, ({ one }) => ({
  giveaway: one(giveaways, {
    fields: [giveawayRequirements.giveawayId],
    references: [giveaways.id],
  }),
}));

export const giveawayPrizesRelations = relations(giveawayPrizes, ({ one }) => ({
  giveaway: one(giveaways, {
    fields: [giveawayPrizes.giveawayId],
    references: [giveaways.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Script = typeof approvedScripts.$inferSelect;
export type NewScript = typeof approvedScripts.$inferInsert;
export type Giveaway = typeof giveaways.$inferSelect;
export type NewGiveaway = typeof giveaways.$inferInsert;
export type GiveawayRequirement = typeof giveawayRequirements.$inferSelect;
export type NewGiveawayRequirement = typeof giveawayRequirements.$inferInsert;
export type GiveawayPrize = typeof giveawayPrizes.$inferSelect;
export type NewGiveawayPrize = typeof giveawayPrizes.$inferInsert;
export type GiveawayEntry = typeof giveawayEntries.$inferSelect;
export type NewGiveawayEntry = typeof giveawayEntries.$inferInsert;
export type Ad = typeof approvedAds.$inferSelect;
export type NewAd = typeof approvedAds.$inferInsert;
export type PendingAd = typeof pendingAds.$inferSelect;
export type NewPendingAd = typeof pendingAds.$inferInsert;
