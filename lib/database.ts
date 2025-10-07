/**
 * @deprecated This file is deprecated. Use @/lib/db/client instead.
 * This file is kept for backward compatibility and type exports only.
 * All database operations have been migrated to Drizzle ORM in lib/db/client.ts
 */

// Re-export from canonical database client
export * from './db/client';

// Legacy type exports for backward compatibility
export type UserRole = "founder" | "verified_creator" | "crew" | "admin" | "moderator" | "user"

export interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  username: string | null
  roles: UserRole[]
  created_at?: string
  updated_at?: string
}

// Legacy interfaces for backward compatibility
export interface Script {
  id: number
  title: string
  description: string
  price: number
  original_price?: number
  category: string
  framework?: string
  seller_name: string
  seller_email: string
  seller_id?: string
  tags: string[]
  features: string[]
  requirements: string[]
  images: string[]
  videos: string[]
  screenshots: string[]
  cover_image?: string
  demo_url?: string
  documentation_url?: string
  support_url?: string
  version: string
  last_updated: string
  status: "pending" | "approved" | "rejected"
  featured: boolean
  downloads: number
  rating: number
  review_count: number
  created_at: string
  updated_at: string
}

export interface Giveaway {
  id: number
  title: string
  description: string
  total_value: string
  category: string
  end_date: string
  max_entries?: number
  difficulty: string
  featured: boolean
  auto_announce: boolean
  creator_name: string
  creator_email: string
  creator_id?: string
  images: string[]
  videos: string[]
  cover_image?: string
  tags: string[]
  rules: string[]
  status: "active" | "ended" | "cancelled"
  entries_count: number
  created_at: string
  updated_at: string
}

export interface GiveawayEntry {
  id: number
  giveaway_id: number
  user_id: string
  user_name?: string
  user_email?: string
  status: "active" | "disqualified" | "winner"
  points_earned: number
  requirements_completed: boolean
  entry_date: string
  created_at: string
  updated_at: string
}

export interface GiveawayRequirement {
  id: number
  giveaway_id: number
  title: string
  description: string
  points: number
  required: boolean
}

export interface GiveawayPrize {
  id: number
  giveaway_id: number
  position: number
  name: string
  description: string
  value: string
}

export interface ScriptReview {
  id: number
  script_id: number
  reviewer_name: string
  reviewer_email: string
  rating: number
  title?: string
  comment?: string
  verified_purchase: boolean
  created_at: string
  updated_at: string
}

export interface GiveawayReview {
  id: number
  giveaway_id: number
  reviewer_name: string
  reviewer_email: string
  reviewer_id?: string
  rating: number
  title?: string
  comment?: string
  verified_participant: boolean
  created_at: string
  updated_at: string
}

export interface Ad {
  id: number
  title: string
  description: string
  image_url?: string
  link_url?: string
  category: string
  status: "active" | "inactive" | "expired"
  priority: number
  start_date: string
  end_date?: string
  created_by: string
  created_at: string
  updated_at: string
}

// All database functions have been migrated to @/lib/db/client
// This file is kept for type exports and backward compatibility only
