import { randomUUID } from 'crypto';
import { db } from './db/client';

// App-generated integer primary key (the prod DB uses manual integer PKs, not
// DB identity). Seconds-resolution timestamp + random; fits PostgreSQL int4.
function genId(): number {
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
}
import { eq, and, or, like, gte, lte, sql, desc, asc, getTableColumns, ne, lt, inArray } from 'drizzle-orm';
import { 
  users, pendingScripts, approvedScripts, rejectedScripts, 
  pendingGiveaways, approvedGiveaways, rejectedGiveaways, 
  pendingProps, approvedProps, rejectedProps,
  giveawayEntries, 
  giveawayRequirements, giveawayPrizes, giveawayPrizeWinners, pendingAds, approvedAds, rejectedAds,
  userAdSlots, featuredScripts,
  userFeaturedScriptSlots,
  categories,
  frameworks,
  sideBannerBookings,
  verificationRequests,
  orders, orderItems,
  type Script, type Giveaway, type NewCategory, type NewFramework
} from './db/schema';
import type { 
  NewUser, NewScript, NewGiveaway, NewGiveawayEntry, 
  NewAd, 
  NewGiveawayRequirement, NewGiveawayPrize, NewFeaturedScript, NewPendingProp
} from './db/schema';
import { validateFrameworks } from './constants';
import { announceScriptFeatured } from './discord';

// Valid roles in the system
export const VALID_ROLES = ['founder', 'verified_creator', 'crew', 'admin', 'moderator', 'prop_lister', 'user'] as const;
export type ValidRole = typeof VALID_ROLES[number];

// Helper function to validate roles
export function validateRoles(roles: string[]): ValidRole[] {
  return roles.filter(role => VALID_ROLES.includes(role as ValidRole)) as ValidRole[];
}

// Helper function to check if user has a specific role
export function hasRole(userRoles: string[], requiredRole: ValidRole): boolean {
  return userRoles.includes(requiredRole);
}

// Helper function to check if user has any of the required roles
export function hasAnyRole(userRoles: string[], requiredRoles: ValidRole[]): boolean {
  return requiredRoles.some(role => userRoles.includes(role));
}

// Helper function to check if user has all required roles
export function hasAllRoles(userRoles: string[], requiredRoles: ValidRole[]): boolean {
  return requiredRoles.every(role => userRoles.includes(role));
}

// User functions
export async function upsertUser(user: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string | null;
  // Usernames that should always be founders (owner/staff bootstrap accounts).
  // Applies to NEW and EXISTING users so the owner can't get locked out.
  forceAdminUsernames?: string[] | null;
}) {
  // Check if user already exists
  const existingUser = await getUserById(user.id);

  const isForceAdmin =
    !!user.username && (user.forceAdminUsernames ?? []).includes(user.username);

  // Determine roles based on user status
  let userRoles: string[];

  if (existingUser) {
    // Existing user: keep their roles, but ensure force-admins are founders.
    const current = validateRoles(existingUser.roles || ['user']);
    userRoles = isForceAdmin && !current.includes('founder')
      ? validateRoles([...current, 'founder'])
      : current;
  } else {
    // New user: founder if bootstrap account, else default.
    userRoles = isForceAdmin ? ['founder'] : ['user'];
  }
  
  await db.insert(users).values({
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
    username: user.username ?? null,
    roles: userRoles,
  }).onConflictDoUpdate({
    target: users.id,
    set: {
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
      username: user.username ?? null,
      // userRoles already preserves existing users' roles (and only upgrades
      // force-admin bootstrap accounts to founder) — see above.
      roles: userRoles,
      updatedAt: new Date(),
    },
  });
}

export async function getUserById(id: string) {
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user[0] ?? null;
}

export async function getAllUsers(limit?: number) {
  const defaultLimit = limit || 100;
  const userList = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(defaultLimit);
  
  return userList;
}

export async function updateUserRole(userId: string, roles: string[]) {
  console.log(`Updating user ${userId} roles to:`, roles);
  
  // Validate and filter roles to only include valid ones
  const validRoles = validateRoles(roles);
  
  if (validRoles.length === 0) {
    throw new Error('No valid roles provided. Valid roles are: ' + VALID_ROLES.join(', '));
  }
  
  const result = await db.update(users)
    .set({ roles: validRoles, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  
  console.log(`User ${userId} roles updated successfully:`, result[0]?.roles);
  return result[0] ?? null;
}

export async function updateUserProfilePicture(userId: string, profilePictureUrl: string | null) {
  const result = await db.update(users)
    .set({ profilePicture: profilePictureUrl, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  
  return result[0] ?? null;
}

export async function updateUserName(userId: string, name: string | null) {
  const result = await db.update(users)
    .set({ name: name, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  
  return result[0] ?? null;
}

// Get user's purchased ad slots
export async function getUserPurchasedAdSlots(userId: string): Promise<number> {
  const user = await db.select({ purchasedAdSlots: users.purchasedAdSlots })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  return user[0]?.purchasedAdSlots ?? 0;
}

// Add slots to user's purchased count (after a completed purchase)
export async function addPurchasedAdSlots(userId: string, slotsToAdd: number): Promise<number> {
  // First get current value
  const currentUser = await db.select({ purchasedAdSlots: users.purchasedAdSlots })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  const currentSlots = currentUser[0]?.purchasedAdSlots ?? 0;
  const newTotal = currentSlots + slotsToAdd;
  
  // Update with new total
  const result = await db.update(users)
    .set({ 
      purchasedAdSlots: newTotal,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId))
    .returning({ purchasedAdSlots: users.purchasedAdSlots });
  
  return result[0]?.purchasedAdSlots ?? newTotal;
}

// Generate unique slot ID
function generateSlotUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `slot_${timestamp}_${random}`;
}

// Get the next available slot number for a user
async function getNextSlotNumber(userId: string): Promise<number> {
  // Get all slots for this user (active and inactive) to find the highest slot number
  const allSlots = await db
    .select()
    .from(userAdSlots)
    .where(eq(userAdSlots.userId, userId));

  if (allSlots.length === 0) {
    return 1; // First slot
  }

  // Find the maximum slot number across all slotNumber arrays
  let maxSlotNumber = 0;
  for (const slot of allSlots) {
    const slotNumbers = (slot.slotNumber || []) as number[];
    if (slotNumbers.length > 0) {
      const maxInSlot = Math.max(...slotNumbers);
      if (maxInSlot > maxSlotNumber) {
        maxSlotNumber = maxInSlot;
      }
    }
  }

  return maxSlotNumber + 1;
}

// Get count of active slots for a user
// Counts the total number of slots across all active rows (sum of slotNumber array lengths)
export async function getUserActiveAdSlots(userId: string): Promise<number> {
  try {
    const activeSlots = await db
      .select()
      .from(userAdSlots)
      .where(
        and(
          eq(userAdSlots.userId, userId),
          eq(userAdSlots.status, 'active')
        )
      );
    
    // Sum up the total number of slots from all rows
    // Each row contains an array of slot numbers, so we count the total length
    let totalSlots = 0;
    for (const slot of activeSlots) {
      const slotNumbers = (slot.slotNumber || []) as number[];
      totalSlots += slotNumbers.length;
    }
    
    return totalSlots;
  } catch (error) {
    console.error('Error in getUserActiveAdSlots:', error);
    // Return 0 if table doesn't exist or query fails
    return 0;
  }
}

// Create ad slots with proper slot numbers and unique IDs (one-time purchase)
// Creates a single row with sequential slot numbers and unique IDs
export async function createAdSlots(
  userId: string,
  slotsToAdd: number,
  orderRefIds: string[],
  packageId: string, // Package type: 'starter', 'premium', or 'executive'
  durationMonths: number // Duration in months (1, 3, 6, or 12)
): Promise<{ id: number; slotNumber: number[]; slotUniqueIds: string[] }> {
  if (orderRefIds.length !== slotsToAdd) {
    throw new Error('Order reference IDs count must match slots to add');
  }

  if (!['starter', 'premium', 'executive'].includes(packageId)) {
    throw new Error('Invalid package ID. Must be starter, premium, or executive');
  }

  if (![1, 3, 6, 12].includes(durationMonths)) {
    throw new Error('Invalid duration. Must be 1, 3, 6, or 12 months');
  }

  const now = new Date();
  
  // Calculate end date based on purchase date + duration
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + durationMonths);

  // Get the starting slot number for this user
  const startingSlotNumber = await getNextSlotNumber(userId);

  // Generate sequential slot numbers [1, 2, 3, 4, 5] or [startingSlotNumber, startingSlotNumber+1, ...]
  const slotNumbers: number[] = [];
  for (let i = 0; i < slotsToAdd; i++) {
    slotNumbers.push(startingSlotNumber + i);
  }

  // Generate unique IDs for all slots (exactly one unique ID per slot)
  const slotUniqueIds: string[] = [];
  for (let i = 0; i < slotsToAdd; i++) {
    slotUniqueIds.push(generateSlotUniqueId());
  }

  // Use the first order reference ID (all slots are in one purchase).
  const orderReference = orderRefIds[0] || null;

  // Create a single row with sequential slot numbers and unique IDs.
  const result = await db
    .insert(userAdSlots)
    .values({
      id: genId(), // app-generated integer PK (prod has manual PKs)
      userId: userId,
      slotNumber: slotNumbers, // Array of sequential slot numbers [1, 2, 3, 4, 5]
      slotUniqueIds: slotUniqueIds, // Array of unique IDs, one per slot
      purchaseDate: now,
      endDate: endDate,
      packageId: packageId,
      durationMonths: durationMonths,
      paypalOrderId: orderReference,
      status: 'active' as const,
    } as any)
    .returning({ 
      id: userAdSlots.id,
      slotNumber: userAdSlots.slotNumber,
      slotUniqueIds: userAdSlots.slotUniqueIds
    });

  if (!result[0]) {
    throw new Error('Failed to create ad slots');
  }

  // Ensure slotNumber and slotUniqueIds are never null
  return {
    id: result[0].id,
    slotNumber: (result[0].slotNumber || []) as number[],
    slotUniqueIds: (result[0].slotUniqueIds || []) as string[]
  };
}

// Get all slots for a user (for admin/debugging)
export async function getUserAdSlots(userId: string) {
  return await db
    .select()
    .from(userAdSlots)
    .where(eq(userAdSlots.userId, userId))
    .orderBy(desc(userAdSlots.purchaseDate)); // Order by purchase date since slotNumber is now an array
}

// Get slot by slotUniqueId to retrieve slot information (including endDate)
export async function getSlotByUniqueId(slotUniqueId: string) {
  // Query all slots and filter in JavaScript since Drizzle doesn't have great array support
  const allSlots = await db
    .select()
    .from(userAdSlots);
  
  // Find slot where slotUniqueIds array contains the given slotUniqueId
  const slot = allSlots.find(s => {
    const uniqueIds = (s.slotUniqueIds || []) as string[];
    return uniqueIds.includes(slotUniqueId);
  });
  
  return slot || null;
}

// Check and deactivate expired slots and their associated ads
export async function checkAndDeactivateExpiredSlots(): Promise<{ checked: number; deactivated: number; adsDeactivated: number }> {
  const now = new Date();
  
  // Find all active slots that have passed their end date (only check slots with endDate set)
  const expiredSlots = await db
    .select()
    .from(userAdSlots)
    .where(
      and(
        eq(userAdSlots.status, 'active'),
        sql`${userAdSlots.endDate} IS NOT NULL`,
        sql`${userAdSlots.endDate} < CURRENT_TIMESTAMP`
      )
    );
  
  let adsDeactivated = 0;
  
  // Deactivate each expired slot and its associated ads
  for (const slot of expiredSlots) {
    // Get all unique IDs for this slot
    const slotUniqueIds = (slot.slotUniqueIds || []) as string[];
    
    // Deactivate all ads associated with this slot's unique IDs
    for (const uniqueId of slotUniqueIds) {
      // Deactivate ads in approved_ads table
      const approvedAdsToDeactivate = await db
        .select()
        .from(approvedAds)
        .where(
          and(
            eq(approvedAds.slotUniqueId, uniqueId),
            eq(approvedAds.status, 'active')
          )
        );
      
      for (const ad of approvedAdsToDeactivate) {
        await db
          .update(approvedAds)
          .set({ 
            status: 'inactive',
            slotStatus: 'inactive',
            updatedAt: new Date()
          })
          .where(eq(approvedAds.id, ad.id));
        adsDeactivated++;
      }
      
      // Update slotStatus in pending_ads table (regardless of status)
      const pendingAdsToUpdate = await db
        .select()
        .from(pendingAds)
        .where(eq(pendingAds.slotUniqueId, uniqueId));
      
      for (const ad of pendingAdsToUpdate) {
        await db
          .update(pendingAds)
          .set({ 
            slotStatus: 'inactive',
            updatedAt: new Date()
          })
          .where(eq(pendingAds.id, ad.id));
      }
      
      // Update slotStatus in rejected_ads table (regardless of status)
      const rejectedAdsToUpdate = await db
        .select()
        .from(rejectedAds)
        .where(eq(rejectedAds.slotUniqueId, uniqueId));
      
      for (const ad of rejectedAdsToUpdate) {
        await db
          .update(rejectedAds)
          .set({ 
            slotStatus: 'inactive',
            updatedAt: new Date()
          })
          .where(eq(rejectedAds.id, ad.id));
      }
    }
    
    // Deactivate the slot itself
    await db
      .update(userAdSlots)
      .set({ 
        status: 'inactive'
      })
      .where(eq(userAdSlots.id, slot.id));
  }
  
  // Also check for individual ads that have passed their end date (independent of slot expiration)
  const expiredAds = await db
    .select()
    .from(approvedAds)
    .where(
      and(
        eq(approvedAds.status, 'active'),
        sql`${approvedAds.endDate} IS NOT NULL`,
        lt(approvedAds.endDate, now)  // Changed from: sql`${approvedAds.endDate} < ${now}`
      )
    );
  
  // Deactivate expired ads
  for (const ad of expiredAds) {
    await db
      .update(approvedAds)
      .set({ 
        status: 'inactive',
        slotStatus: 'inactive',
        updatedAt: new Date()
      })
      .where(eq(approvedAds.id, ad.id));
    adsDeactivated++;
  }
  
  return {
    checked: expiredSlots.length,
    deactivated: expiredSlots.length,
    adsDeactivated
  };
}

// Check and deactivate expired featured script slots and their associated featured scripts
export async function checkAndDeactivateExpiredFeaturedScriptSlots(): Promise<{ checked: number; deactivated: number; featuredScriptsDeactivated: number; scriptsUpdated: number }> {
  const now = new Date();
  
  // Find all active featured script slots that have passed their end date
  const expiredSlots = await db
    .select()
    .from(userFeaturedScriptSlots)
    .where(
      and(
        eq(userFeaturedScriptSlots.featuredSlotStatus, 'active'),
        sql`${userFeaturedScriptSlots.featuredSlotEndDate} IS NOT NULL`,
        sql`${userFeaturedScriptSlots.featuredSlotEndDate} < CURRENT_TIMESTAMP`
      )
    );
  
  let featuredScriptsDeactivated = 0;
  const scriptIdsToCheck = new Set<number>();
  
  // Deactivate each expired slot and its associated featured scripts
  for (const slot of expiredSlots) {
    // Get all unique IDs for this slot
    const slotUniqueIds = (slot.featuredSlotUniqueIds || []) as string[];
    
    // Deactivate all featured scripts associated with this slot's unique IDs
    for (const uniqueId of slotUniqueIds) {
      // Find featured scripts using this slot unique ID
      const featuredScriptsToDeactivate = await db
        .select()
        .from(featuredScripts)
        .where(
          and(
            eq(featuredScripts.featuredSlotUniqueId, uniqueId),
            eq(featuredScripts.featuredStatus, 'active')
          )
        );
      
      for (const featuredScript of featuredScriptsToDeactivate) {
        // Track script IDs to check if they need featured field updated
        scriptIdsToCheck.add(featuredScript.scriptId);
        
        // Deactivate the featured script - update both featuredStatus and featuredSlotStatus
        await db
          .update(featuredScripts)
          .set({ 
            featuredStatus: 'inactive',
            featuredSlotStatus: 'inactive',
            featuredUpdatedAt: new Date()
          })
          .where(eq(featuredScripts.id, featuredScript.id));
        featuredScriptsDeactivated++;
      }
    }
    
    // Deactivate the slot itself
    await db
      .update(userFeaturedScriptSlots)
      .set({ 
        featuredSlotStatus: 'inactive'
      })
      .where(eq(userFeaturedScriptSlots.id, slot.id));
  }
  
  // Also check for individual featured scripts that have passed their end date (independent of slot expiration)
  const expiredFeaturedScripts = await db
    .select()
    .from(featuredScripts)
    .where(
      and(
        eq(featuredScripts.featuredStatus, 'active'),
        sql`${featuredScripts.featuredEndDate} IS NOT NULL`,
        lt(featuredScripts.featuredEndDate, now)
      )
    );
  
  // Deactivate expired featured scripts
  for (const featuredScript of expiredFeaturedScripts) {
    scriptIdsToCheck.add(featuredScript.scriptId);
    
    // Deactivate the featured script - update both featuredStatus and featuredSlotStatus
    await db
      .update(featuredScripts)
      .set({ 
        featuredStatus: 'inactive',
        featuredSlotStatus: 'inactive',
        featuredUpdatedAt: new Date()
      })
      .where(eq(featuredScripts.id, featuredScript.id));
    featuredScriptsDeactivated++;
  }
  
  // Update the featured field in approvedScripts for scripts that no longer have active featured entries
  let scriptsUpdated = 0;
  for (const scriptId of scriptIdsToCheck) {
    // Check if there are any other active featured entries for this script
    const otherActiveFeaturedEntries = await db
      .select()
      .from(featuredScripts)
      .where(
        and(
          eq(featuredScripts.scriptId, scriptId),
          eq(featuredScripts.featuredStatus, 'active')
        )
      );
    
    // If no other active featured entries exist, set featured to false in approvedScripts
    if (otherActiveFeaturedEntries.length === 0) {
      await db
        .update(approvedScripts)
        .set({ 
          featured: false,
          updatedAt: new Date()
        })
        .where(eq(approvedScripts.id, scriptId));
      scriptsUpdated++;
    }
  }
  
  return {
    checked: expiredSlots.length + expiredFeaturedScripts.length,
    deactivated: expiredSlots.length,
    featuredScriptsDeactivated,
    scriptsUpdated
  };
}

// Helper function to get user profile picture with priority: profile_picture first, then Discord image
export function getUserProfilePicture(user: { profilePicture?: string | null; image?: string | null } | null): string | null {
  if (!user) return null;
  return user.profilePicture || user.image || null;
}

// Script functions
export async function createScript(scriptData: NewScript & { framework?: string | string[] }): Promise<number> {
  const frameworkArray = Array.isArray((scriptData as any).framework)
    ? ((scriptData as any).framework as string[])
    : (typeof (scriptData as any).framework === 'string' && (scriptData as any).framework
        ? [String((scriptData as any).framework)]
        : []);

  // Validate and filter frameworks
  const validatedFrameworks = validateFrameworks(frameworkArray);

  const scriptWithDefaults = {
    ...scriptData,
    id: genId(), // app-generated integer PK (prod has manual PKs)
    seller_name: scriptData.seller_name || 'Unknown Seller',
    seller_email: scriptData.seller_email || 'unknown@example.com',
    featured: scriptData.featured ?? false,
    free: (scriptData as any).free ?? false,
    hidePrice: (scriptData as any).hidePrice ?? false,
    images: scriptData.images || [],
    videos: scriptData.videos || [],
    screenshots: scriptData.screenshots || [],
    // tags: scriptData.tags || [],
    features: scriptData.features || [],
    requirements: scriptData.requirements || [],
    link: scriptData.link || null,
    otherLinks: (scriptData as any).otherLinks || [],
    // Tebex Headless integration: seller's own store token + package id (nullable).
    tebexStoreToken: (scriptData as any).tebexStoreToken ?? null,
    tebexPackageId: (scriptData as any).tebexPackageId ?? null,
    // Optional seller Discord link → renders a "Join Discord" button on detail page.
    discordLink: (scriptData as any).discordLink ?? null,
    // Normalize framework as text[] for DB with validation
    framework: validatedFrameworks,
  };

  const result = await db
    .insert(pendingScripts)
    .values(scriptWithDefaults)
    .returning({ id: pendingScripts.id });
  
  return result[0]?.id ?? 0;
}

export type ScriptFilters = {
  category?: string;
  framework?: string | string[];
  status?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

export async function getScripts(filters?: ScriptFilters) {
  const limit = filters?.limit || 100;
  const offset = filters?.offset || 0;
  
  try {
    let baseQuery = db.select().from(approvedScripts);
    
    // Build conditions array for WHERE clause
    const conditions: any[] = [];
    
    if (filters?.category) {
      conditions.push(eq(approvedScripts.category, filters.category));
    }
    
    if (filters?.framework) {
      const frameworks = Array.isArray(filters.framework) ? filters.framework : [filters.framework]
      // approvedScripts.framework is text[] now; use SQL ANY/overlap
      conditions.push(sql`(${approvedScripts.framework}) && ${frameworks}` as any)
    }
    
    if (filters?.featured) {
      conditions.push(eq(approvedScripts.featured, true));
    }
    
    const query = conditions.length > 0
      ? baseQuery.where(and(...conditions))
      : baseQuery;
    
    // Execute query with sorting by createdAt
    const results = await query
      .orderBy(desc(approvedScripts.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Fetch seller roles and images for all scripts with sellerId
    const sellerIds = results
      .map(s => s.sellerId)
      .filter((id): id is string => !!id);
    
    const sellerRolesMap = new Map<string, string[] | null>();
    const sellerImagesMap = new Map<string, string | null>();
    if (sellerIds.length > 0) {
      // Fetch all sellers in one query
      const uniqueSellerIds = [...new Set(sellerIds)];
      const sellers = await db
        .select({ id: users.id, roles: users.roles, profilePicture: users.profilePicture, image: users.image })
        .from(users)
        .where(inArray(users.id, uniqueSellerIds));
      
      sellers.forEach(seller => {
        sellerRolesMap.set(seller.id, seller.roles);
        sellerImagesMap.set(seller.id, getUserProfilePicture(seller));
      });
    }
    
    // Map database fields to API-expected field names
    const mappedResults = results.map(script => ({
      ...script,
      cover_image: script.coverImage,
      original_price: script.originalPrice,
      currency: script.currency,
      currency_symbol: script.currencySymbol,
      seller_name: script.seller_name,
      seller_email: script.seller_email,
      seller_id: script.sellerId,
      seller_image: script.sellerId ? sellerImagesMap.get(script.sellerId) || null : null,
      seller_roles: script.sellerId ? sellerRolesMap.get(script.sellerId) || null : null,
      other_links: script.otherLinks || [],
      youtube_video_link: script.youtubeVideoLink,
      featured: script.featured, // Explicitly include featured field
      created_at: script.createdAt,
      updated_at: script.updatedAt,
    }));
    
    return mappedResults;
  } catch (error) {
    console.error('Error fetching scripts:', error);
    throw error;
  }
}


export async function getScriptById(id: number) {
  try {
    // First check approved_scripts (most common case)
    const approvedScript = await db
      .select()
      .from(approvedScripts)
      .where(eq(approvedScripts.id, id))
      .limit(1);
      
    if (approvedScript.length > 0) {
      const script = approvedScript[0];
      
      // Fetch seller's profile picture with priority: profile_picture first, then Discord image
      let sellerImage = null;
      let sellerRoles = null;
      if (script.sellerId) {
        const sellerResult = await db.select().from(users).where(eq(users.id, script.sellerId));
        if (sellerResult.length > 0) {
          sellerImage = getUserProfilePicture(sellerResult[0]);
          sellerRoles = sellerResult[0].roles;
        }
      }
      
      return { 
        ...script, 
        status: 'approved' as const,
        seller_image: sellerImage,
        seller_roles: sellerRoles,
        cover_image: script.coverImage,
        original_price: script.originalPrice,
        currency: script.currency,
        currency_symbol: script.currencySymbol,
        seller_name: script.seller_name,
        seller_email: script.seller_email,
        other_links: script.otherLinks || [],
        youtube_video_link: script.youtubeVideoLink,
        created_at: script.createdAt,
        updated_at: script.updatedAt,
      };
    }
    
    // Check pending_scripts
    const pendingScript = await db
      .select()
      .from(pendingScripts)
      .where(eq(pendingScripts.id, id))
      .limit(1);
      
    if (pendingScript.length > 0) {
      const script = pendingScript[0];
      
      // Fetch seller's profile picture with priority: profile_picture first, then Discord image
      let sellerImage = null;
      let sellerRoles = null;
      if (script.sellerId) {
        const sellerResult = await db.select().from(users).where(eq(users.id, script.sellerId));
        if (sellerResult.length > 0) {
          sellerImage = getUserProfilePicture(sellerResult[0]);
          sellerRoles = sellerResult[0].roles;
        }
      }
      
      return { 
        ...script, 
        status: 'pending' as const,
        seller_image: sellerImage,
        seller_roles: sellerRoles,
        cover_image: script.coverImage,
        original_price: script.originalPrice,
        currency: script.currency,
        currency_symbol: script.currencySymbol,
        seller_name: script.seller_name,
        seller_email: script.seller_email,
        other_links: script.otherLinks || [],
        youtube_video_link: script.youtubeVideoLink,
        created_at: script.createdAt,
        updated_at: script.updatedAt,
      };
    }
    
    // Check rejected_scripts
    const rejectedScript = await db
      .select()
      .from(rejectedScripts)
      .where(eq(rejectedScripts.id, id))
      .limit(1);
      
    if (rejectedScript.length > 0) {
      const script = rejectedScript[0];
      
      // Fetch seller's profile picture with priority: profile_picture first, then Discord image
      let sellerImage = null;
      let sellerRoles = null;
      if (script.sellerId) {
        const sellerResult = await db.select().from(users).where(eq(users.id, script.sellerId));
        if (sellerResult.length > 0) {
          sellerImage = getUserProfilePicture(sellerResult[0]);
          sellerRoles = sellerResult[0].roles;
        }
      }
      
      return { 
        ...script, 
        status: 'rejected' as const,
        seller_image: sellerImage,
        seller_roles: sellerRoles,
        cover_image: script.coverImage,
        original_price: script.originalPrice,
        currency: script.currency,
        currency_symbol: script.currencySymbol,
        seller_name: script.seller_name,
        seller_email: script.seller_email,
        other_links: script.otherLinks || [],
        youtube_video_link: script.youtubeVideoLink,
        created_at: script.createdAt,
        updated_at: script.updatedAt,
      };
    }
    return null;
  } catch (error) {
    console.error('Error in getScriptById:', error);
    return null;
  }
}

// Prop functions
export async function createProp(propData: Omit<NewPendingProp, 'id'> & { id?: string }): Promise<string> {
  // Collision-resistant text id (props use text PKs).
  const id = propData.id || `prop_${randomUUID()}`;

  const result = await db
    .insert(pendingProps)
    .values({
      ...propData,
      id,
      images: propData.images || [],
      // Tebex Headless integration: lister's own store token + package id (nullable).
      tebexStoreToken: (propData as any).tebexStoreToken ?? null,
      tebexPackageId: (propData as any).tebexPackageId ?? null,
    })
    .returning({ id: pendingProps.id });

  return result[0]?.id ?? id;
}

// Resolve prop ownership (createdBy) for a set of prop ids. A prop's id is its
// text PK and is what the platform cart stores as `itemId` for prop line items.
// Checks approved → pending → rejected so ownership resolves regardless of the
// prop's approval state. Returns a Map of propId → createdBy (owner user id).
// Used by coupon validation to confine a creator's coupon to their OWN props.
export async function getPropOwnersByIds(propIds: string[]): Promise<Map<string, string>> {
  const owners = new Map<string, string>();
  const uniqueIds = [...new Set(propIds.filter((id) => typeof id === 'string' && id.length > 0))];
  if (uniqueIds.length === 0) return owners;

  const tables = [approvedProps, pendingProps, rejectedProps] as const;
  for (const table of tables) {
    const rows = await db
      .select({ id: table.id, createdBy: table.createdBy })
      .from(table)
      .where(inArray(table.id, uniqueIds));
    for (const row of rows) {
      // First match wins (approved has priority); don't overwrite once set.
      if (row.id && row.createdBy && !owners.has(row.id)) {
        owners.set(row.id, row.createdBy);
      }
    }
  }

  return owners;
}

export async function getApprovedProps(limit?: number) {
  const base = db
    .select()
    .from(approvedProps)
    .orderBy(desc(approvedProps.createdAt));
  return await (limit ? base.limit(limit) : base);
}

export async function getPendingProps(limit?: number) {
  const base = db
    .select()
    .from(pendingProps)
    .orderBy(desc(pendingProps.submittedAt));
  return await (limit ? base.limit(limit) : base);
}

export async function getRejectedProps(limit?: number) {
  const base = db
    .select()
    .from(rejectedProps)
    .orderBy(desc(rejectedProps.rejectedAt));
  return await (limit ? base.limit(limit) : base);
}

export async function approveProp(propId: string, adminId: string, adminNotes?: string) {
  const pendingProp = await db
    .select()
    .from(pendingProps)
    .where(eq(pendingProps.id, propId))
    .limit(1);

  if (!pendingProp[0]) {
    throw new Error('Prop not found in pending props');
  }

  const approvedProp = await db
    .insert(approvedProps)
    .values({
      ...pendingProp[0],
      approvedAt: new Date(),
      approvedBy: adminId,
      adminNotes: adminNotes || null,
    })
    .returning();

  await db.delete(pendingProps).where(eq(pendingProps.id, propId));

  return approvedProp[0];
}

export async function rejectProp(propId: string, adminId: string, rejectionReason: string, adminNotes?: string) {
  let prop = await db
    .select()
    .from(pendingProps)
    .where(eq(pendingProps.id, propId))
    .limit(1);
  let sourceTable: 'pending' | 'approved' = 'pending';

  if (!prop[0]) {
    const approvedProp = await db
      .select()
      .from(approvedProps)
      .where(eq(approvedProps.id, propId))
      .limit(1);

    if (approvedProp[0]) {
      prop = [{
        ...approvedProp[0],
        submittedAt: approvedProp[0].createdAt,
        adminNotes: approvedProp[0].adminNotes,
      } as any];
      sourceTable = 'approved';
    }
  }

  if (!prop[0]) {
    throw new Error('Prop not found in pending or approved props');
  }

  const rejectedProp = await db
    .insert(rejectedProps)
    .values({
      ...prop[0],
      rejectedAt: new Date(),
      rejectedBy: adminId,
      rejectionReason,
      adminNotes: adminNotes || null,
    })
    .returning();

  if (sourceTable === 'pending') {
    await db.delete(pendingProps).where(eq(pendingProps.id, propId));
  } else {
    await db.delete(approvedProps).where(eq(approvedProps.id, propId));
  }

  return rejectedProp[0];
}

// Admin functions for script management
export async function getPendingScripts(limit?: number) {
  try {
    const base = db
      .select()
      .from(pendingScripts)
      .orderBy(desc(pendingScripts.createdAt));
    const results = await (limit ? base.limit(limit) : base);
    return results;
  } catch (error) {
    console.error('Error fetching pending scripts:', error);
    throw error;
  }
}

// Admin functions for script management
// (removed duplicate getPendingScripts)

export async function getApprovedScripts(limit?: number) {
  try {
    const base = db
      .select()
      .from(approvedScripts)
      .orderBy(desc(approvedScripts.createdAt));
    const results = await (limit ? base.limit(limit) : base);
    return results;
  } catch (error) {
    console.error('Error fetching approved scripts:', error);
    throw error;
  }
}

export async function getRejectedScripts(limit?: number) {
  try {
    const base = db
      .select()
      .from(rejectedScripts)
      .orderBy(desc(rejectedScripts.createdAt));
    const results = await (limit ? base.limit(limit) : base);
    return results;
  } catch (error) {
    console.error('Error fetching rejected scripts:', error);
    throw error;
  }
}

// (removed duplicate script admin functions; see definitive implementations below)

export async function approveScript(scriptId: number, adminId: string, adminNotes?: string) {
  try {
    console.log('approveScript called with:', { scriptId, adminId, adminNotes });
    
    // Get the pending script
    const pendingScript = await db.select().from(pendingScripts).where(eq(pendingScripts.id, scriptId)).limit(1);
    
    if (pendingScript.length === 0) {
      throw new Error('Script not found in pending scripts');
    }
    
    const script = pendingScript[0];
    
    // Insert into approved_scripts table
    const approvedScript = await db.insert(approvedScripts).values({
      ...script,
      approvedAt: new Date(),
      approvedBy: adminId,
      adminNotes: adminNotes || null
    }).returning();
    
    // Delete from pending_scripts table
    await db.delete(pendingScripts).where(eq(pendingScripts.id, scriptId));
    
    console.log('Script approved successfully:', approvedScript[0]);
    return approvedScript[0];
  } catch (error) {
    console.error('Error approving script:', error);
    throw error;
  }
}

export async function rejectScript(scriptId: number, adminId: string, rejectionReason: string, adminNotes?: string) {
  try {
    console.log('rejectScript called with:', { scriptId, adminId, rejectionReason, adminNotes });
    
    // First try to get from pending scripts
    let script = await db.select().from(pendingScripts).where(eq(pendingScripts.id, scriptId)).limit(1);
    let sourceTable = 'pending';
    
    // If not found in pending, try approved scripts
    if (script.length === 0) {
      const approvedScript = await db.select().from(approvedScripts).where(eq(approvedScripts.id, scriptId)).limit(1);
      if (approvedScript.length > 0) {
        // Convert approved script to pending script format for rejection
        const approvedData = approvedScript[0];
        script = [{
          ...approvedData,
          submittedAt: approvedData.createdAt, // Use createdAt as submittedAt
          adminNotes: approvedData.adminNotes
        } as any];
        sourceTable = 'approved';
      }
    }
    
    if (script.length === 0) {
      throw new Error('Script not found in pending or approved scripts');
    }
    
    const scriptData = script[0];
    
    // Insert into rejected_scripts table
    const rejectedScript = await db.insert(rejectedScripts).values({
      ...scriptData,
      rejectedAt: new Date(),
      rejectedBy: adminId,
      rejectionReason,
      adminNotes: adminNotes || null
    }).returning();
    
    // If moving from approved to rejected, remove associated featured scripts
    if (sourceTable === 'approved') {
      // Find all featured scripts associated with this script
      const associatedFeaturedScripts = await db
        .select()
        .from(featuredScripts)
        .where(eq(featuredScripts.scriptId, scriptId));
      
      // Delete all associated featured scripts
      if (associatedFeaturedScripts.length > 0) {
        await db.delete(featuredScripts).where(eq(featuredScripts.scriptId, scriptId));
        console.log(`Deleted ${associatedFeaturedScripts.length} featured script(s) associated with script ${scriptId}`);
      }
      
      // Update the featured field to false in approved_scripts before deleting
      await db
        .update(approvedScripts)
        .set({ featured: false, updatedAt: new Date() })
        .where(eq(approvedScripts.id, scriptId));
    }
    
    // Delete from the source table
    if (sourceTable === 'pending') {
      await db.delete(pendingScripts).where(eq(pendingScripts.id, scriptId));
    } else {
      await db.delete(approvedScripts).where(eq(approvedScripts.id, scriptId));
    }
    
    console.log('Script rejected successfully:', rejectedScript[0]);
    return rejectedScript[0];
  } catch (error) {
    console.error('Error rejecting script:', error);
    throw error;
  }
}

// Function to handle script edits that require re-approval
export async function updateScriptForReapproval(id: number, updateData: any) {
  try {
    console.log('updateScriptForReapproval called with:', { id, updateData });

    // First, get the current script from approved_scripts
    const currentScript = await db.select().from(approvedScripts).where(eq(approvedScripts.id, id)).limit(1);
    
    if (!currentScript[0]) {
      throw new Error('Script not found in approved_scripts');
    }

    // Map incoming payload keys (may be snake_case) to schema property names
    const mappedUpdate: any = { 
      updatedAt: new Date(),
    };

    const assignIfDefined = (prop: string, value: any) => {
      if (value !== undefined) mappedUpdate[prop] = value;
    };

    // Simple passthrough fields (same casing as schema)
    assignIfDefined('title', updateData.title);
    assignIfDefined('description', updateData.description);
    if (updateData.price !== undefined) assignIfDefined('price', Number(updateData.price));
    if (updateData.originalPrice !== undefined) assignIfDefined('originalPrice', updateData.originalPrice === null ? null : Number(updateData.originalPrice));
    // Accept snake_case aliases
    if (updateData.original_price !== undefined) assignIfDefined('originalPrice', updateData.original_price === null ? null : Number(updateData.original_price));
    assignIfDefined('currency', updateData.currency);
    if (updateData.currencySymbol !== undefined) assignIfDefined('currencySymbol', updateData.currencySymbol);
    if (updateData.currency_symbol !== undefined) assignIfDefined('currencySymbol', updateData.currency_symbol);
    assignIfDefined('category', updateData.category);
    // Frameworks: accept string or array and validate
    if (updateData.framework !== undefined) {
      const arrayValue = Array.isArray(updateData.framework) ? updateData.framework : (updateData.framework ? [updateData.framework] : []);
      assignIfDefined('framework', validateFrameworks(arrayValue));
    }
    assignIfDefined('seller_name', updateData.seller_name);
    assignIfDefined('seller_email', updateData.seller_email);
    assignIfDefined('tags', updateData.tags);
    assignIfDefined('features', updateData.features);
    assignIfDefined('requirements', updateData.requirements);
    assignIfDefined('link', updateData.link);
    // Optional Discord link (nullable, accept null to clear)
    if (updateData.discordLink !== undefined) assignIfDefined('discordLink', updateData.discordLink);
    if (updateData.otherLinks !== undefined) assignIfDefined('otherLinks', updateData.otherLinks);
    if (updateData.other_links !== undefined) assignIfDefined('otherLinks', updateData.other_links);
    assignIfDefined('images', updateData.images);
    assignIfDefined('videos', updateData.videos);
    assignIfDefined('screenshots', updateData.screenshots);
    // Media with snake_case aliases
    if (updateData.coverImage !== undefined) assignIfDefined('coverImage', updateData.coverImage);
    if (updateData.cover_image !== undefined) assignIfDefined('coverImage', updateData.cover_image);
    if (updateData.youtubeVideoLink !== undefined) assignIfDefined('youtubeVideoLink', updateData.youtubeVideoLink);
    if (updateData.youtube_video_link !== undefined) assignIfDefined('youtubeVideoLink', updateData.youtube_video_link);
    assignIfDefined('version', updateData.version);
    if (updateData.featured !== undefined) assignIfDefined('featured', Boolean(updateData.featured));
    if (updateData.free !== undefined) assignIfDefined('free', Boolean(updateData.free));
    if (updateData.hidePrice !== undefined) assignIfDefined('hidePrice', Boolean(updateData.hidePrice));
    // Tebex Headless integration fields (nullable, accept null to clear)
    if (updateData.tebexStoreToken !== undefined) assignIfDefined('tebexStoreToken', updateData.tebexStoreToken);
    if (updateData.tebexPackageId !== undefined) assignIfDefined('tebexPackageId', updateData.tebexPackageId);

    console.log('Mapped update object for re-approval:', mappedUpdate);

    // Start a transaction to move script from approved to pending
    const result = await db.transaction(async (tx) => {
      // 1. Find and delete all featured scripts associated with this script
      const associatedFeaturedScripts = await tx
        .select()
        .from(featuredScripts)
        .where(eq(featuredScripts.scriptId, id));
      
      if (associatedFeaturedScripts.length > 0) {
        await tx.delete(featuredScripts).where(eq(featuredScripts.scriptId, id));
        console.log(`Deleted ${associatedFeaturedScripts.length} featured script(s) associated with script ${id}`);
      }
      
      // 2. Update the featured field to false in approved_scripts before deleting
      await tx
        .update(approvedScripts)
        .set({ featured: false, updatedAt: new Date() })
        .where(eq(approvedScripts.id, id));
      
      // 3. Delete from approved_scripts
      await tx.delete(approvedScripts).where(eq(approvedScripts.id, id));
      
      // 4. Insert into pending_scripts with updated data
      // Always set featured to false when moving to pending (scripts need to be re-approved to be featured again)
      const newPendingScript = await tx.insert(pendingScripts)
        .values({
          ...currentScript[0],
          ...mappedUpdate,
          featured: false, // Always set to false when moving to pending
          id: id, // Keep the same ID
        })
        .returning();

      return newPendingScript[0];
    });

    console.log('Script moved to pending for re-approval:', result);
    return result;
  } catch (error) {
    console.error('Error updating script for re-approval:', error);
    throw error;
  }
}

// Update an existing pending script in-place, refreshing submittedAt for review ordering
export async function updatePendingScript(id: number, updateData: any) {
  try {
    console.log('updatePendingScript called with:', { id, updateData });

    const mappedUpdate: any = { updatedAt: new Date() };
    const assignIfDefined = (prop: string, value: any) => {
      if (value !== undefined) mappedUpdate[prop] = value;
    };

    assignIfDefined('title', updateData.title);
    assignIfDefined('description', updateData.description);
    if (updateData.price !== undefined) assignIfDefined('price', Number(updateData.price));
    if (updateData.originalPrice !== undefined) assignIfDefined('originalPrice', updateData.originalPrice === null ? null : Number(updateData.originalPrice));
    if (updateData.original_price !== undefined) assignIfDefined('originalPrice', updateData.original_price === null ? null : Number(updateData.original_price));
    assignIfDefined('currency', updateData.currency);
    if (updateData.currencySymbol !== undefined) assignIfDefined('currencySymbol', updateData.currencySymbol);
    if (updateData.currency_symbol !== undefined) assignIfDefined('currencySymbol', updateData.currency_symbol);
    assignIfDefined('category', updateData.category);
    if (updateData.framework !== undefined) {
      const arrayValue = Array.isArray(updateData.framework) ? updateData.framework : (updateData.framework ? [updateData.framework] : []);
      assignIfDefined('framework', validateFrameworks(arrayValue));
    }
    assignIfDefined('seller_name', updateData.seller_name);
    assignIfDefined('seller_email', updateData.seller_email);
    assignIfDefined('tags', updateData.tags);
    assignIfDefined('features', updateData.features);
    assignIfDefined('requirements', updateData.requirements);
    assignIfDefined('link', updateData.link);
    // Optional Discord link (nullable, accept null to clear)
    if (updateData.discordLink !== undefined) assignIfDefined('discordLink', updateData.discordLink);
    if (updateData.otherLinks !== undefined) assignIfDefined('otherLinks', updateData.otherLinks);
    if (updateData.other_links !== undefined) assignIfDefined('otherLinks', updateData.other_links);
    assignIfDefined('images', updateData.images);
    assignIfDefined('videos', updateData.videos);
    assignIfDefined('screenshots', updateData.screenshots);
    if (updateData.coverImage !== undefined) assignIfDefined('coverImage', updateData.coverImage);
    if (updateData.cover_image !== undefined) assignIfDefined('coverImage', updateData.cover_image);
    if (updateData.youtubeVideoLink !== undefined) assignIfDefined('youtubeVideoLink', updateData.youtubeVideoLink);
    if (updateData.youtube_video_link !== undefined) assignIfDefined('youtubeVideoLink', updateData.youtube_video_link);
    assignIfDefined('version', updateData.version);
    if (updateData.featured !== undefined) assignIfDefined('featured', Boolean(updateData.featured));
    if (updateData.free !== undefined) assignIfDefined('free', Boolean(updateData.free));
    if (updateData.hidePrice !== undefined) assignIfDefined('hidePrice', Boolean(updateData.hidePrice));
    // Tebex Headless integration fields (nullable, accept null to clear)
    if (updateData.tebexStoreToken !== undefined) assignIfDefined('tebexStoreToken', updateData.tebexStoreToken);
    if (updateData.tebexPackageId !== undefined) assignIfDefined('tebexPackageId', updateData.tebexPackageId);

    const result = await db.update(pendingScripts)
      .set(mappedUpdate)
      .where(eq(pendingScripts.id, id))
      .returning();

    return result[0] ?? null;
  } catch (error) {
    console.error('Error updating pending script:', error);
    throw error;
  }
}

// Move a rejected script back to pending for re-approval, applying updates
export async function updateRejectedScriptForReapproval(id: number, updateData: any) {
  try {
    console.log('updateRejectedScriptForReapproval called with:', { id, updateData });

    const currentScript = await db.select().from(rejectedScripts).where(eq(rejectedScripts.id, id)).limit(1);
    if (!currentScript[0]) {
      throw new Error('Script not found in rejected_scripts');
    }

    const mappedUpdate: any = {
      updatedAt: new Date(),
    };
    const assignIfDefined = (prop: string, value: any) => {
      if (value !== undefined) mappedUpdate[prop] = value;
    };

    assignIfDefined('title', updateData.title);
    assignIfDefined('description', updateData.description);
    if (updateData.price !== undefined) assignIfDefined('price', Number(updateData.price));
    if (updateData.originalPrice !== undefined) assignIfDefined('originalPrice', updateData.originalPrice === null ? null : Number(updateData.originalPrice));
    if (updateData.original_price !== undefined) assignIfDefined('originalPrice', updateData.original_price === null ? null : Number(updateData.original_price));
    assignIfDefined('currency', updateData.currency);
    if (updateData.currencySymbol !== undefined) assignIfDefined('currencySymbol', updateData.currencySymbol);
    if (updateData.currency_symbol !== undefined) assignIfDefined('currencySymbol', updateData.currency_symbol);
    assignIfDefined('category', updateData.category);
    if (updateData.framework !== undefined) {
      const arrayValue = Array.isArray(updateData.framework) ? updateData.framework : (updateData.framework ? [updateData.framework] : []);
      assignIfDefined('framework', validateFrameworks(arrayValue));
    }
    assignIfDefined('seller_name', updateData.seller_name);
    assignIfDefined('seller_email', updateData.seller_email);
    assignIfDefined('tags', updateData.tags);
    assignIfDefined('features', updateData.features);
    assignIfDefined('requirements', updateData.requirements);
    assignIfDefined('link', updateData.link);
    // Optional Discord link (nullable, accept null to clear)
    if (updateData.discordLink !== undefined) assignIfDefined('discordLink', updateData.discordLink);
    if (updateData.otherLinks !== undefined) assignIfDefined('otherLinks', updateData.otherLinks);
    if (updateData.other_links !== undefined) assignIfDefined('otherLinks', updateData.other_links);
    assignIfDefined('images', updateData.images);
    assignIfDefined('videos', updateData.videos);
    assignIfDefined('screenshots', updateData.screenshots);
    if (updateData.coverImage !== undefined) assignIfDefined('coverImage', updateData.coverImage);
    if (updateData.cover_image !== undefined) assignIfDefined('coverImage', updateData.cover_image);
    if (updateData.youtubeVideoLink !== undefined) assignIfDefined('youtubeVideoLink', updateData.youtubeVideoLink);
    if (updateData.youtube_video_link !== undefined) assignIfDefined('youtubeVideoLink', updateData.youtube_video_link);
    assignIfDefined('version', updateData.version);
    if (updateData.featured !== undefined) assignIfDefined('featured', Boolean(updateData.featured));
    if (updateData.free !== undefined) assignIfDefined('free', Boolean(updateData.free));
    if (updateData.hidePrice !== undefined) assignIfDefined('hidePrice', Boolean(updateData.hidePrice));
    // Tebex Headless integration fields (nullable, accept null to clear)
    if (updateData.tebexStoreToken !== undefined) assignIfDefined('tebexStoreToken', updateData.tebexStoreToken);
    if (updateData.tebexPackageId !== undefined) assignIfDefined('tebexPackageId', updateData.tebexPackageId);

    const result = await db.transaction(async (tx) => {
      await tx.delete(rejectedScripts).where(eq(rejectedScripts.id, id));
      const inserted = await tx.insert(pendingScripts)
        .values({
          ...currentScript[0],
          ...mappedUpdate,
          featured: false, // Always set to false when moving to pending
          id,
        })
        .returning();
      return inserted[0];
    });

    return result ?? null;
  } catch (error) {
    console.error('Error moving rejected script to pending:', error);
    throw error;
  }
}

// Legacy function for backward compatibility
export async function updateScript(id: number, updateData: any) {
  try {
    console.log('updateScript called with:', { id, updateData });

    // Map incoming payload keys (may be snake_case) to schema property names
    const mappedUpdate: any = { updatedAt: new Date() };

    const assignIfDefined = (prop: string, value: any) => {
      if (value !== undefined) mappedUpdate[prop] = value;
    };

    // Simple passthrough fields (same casing as schema)
    assignIfDefined('title', updateData.title);
    assignIfDefined('description', updateData.description);
    if (updateData.price !== undefined) assignIfDefined('price', Number(updateData.price));
    if (updateData.originalPrice !== undefined) assignIfDefined('originalPrice', updateData.originalPrice === null ? null : Number(updateData.originalPrice));
    // Accept snake_case aliases
    if (updateData.original_price !== undefined) assignIfDefined('originalPrice', updateData.original_price === null ? null : Number(updateData.original_price));
    assignIfDefined('currency', updateData.currency);
    if (updateData.currencySymbol !== undefined) assignIfDefined('currencySymbol', updateData.currencySymbol);
    if (updateData.currency_symbol !== undefined) assignIfDefined('currencySymbol', updateData.currency_symbol);
    assignIfDefined('category', updateData.category);
    // Frameworks: accept string or array and validate
    if (updateData.framework !== undefined) {
      const arrayValue = Array.isArray(updateData.framework) ? updateData.framework : (updateData.framework ? [updateData.framework] : []);
      assignIfDefined('framework', validateFrameworks(arrayValue));
    }
    assignIfDefined('seller_name', updateData.seller_name);
    assignIfDefined('seller_email', updateData.seller_email);
    assignIfDefined('tags', updateData.tags);
    assignIfDefined('features', updateData.features);
    assignIfDefined('requirements', updateData.requirements);
    assignIfDefined('link', updateData.link);
    // Optional Discord link (nullable, accept null to clear)
    if (updateData.discordLink !== undefined) assignIfDefined('discordLink', updateData.discordLink);
    if (updateData.otherLinks !== undefined) assignIfDefined('otherLinks', updateData.otherLinks);
    if (updateData.other_links !== undefined) assignIfDefined('otherLinks', updateData.other_links);
    assignIfDefined('images', updateData.images);
    assignIfDefined('videos', updateData.videos);
    assignIfDefined('screenshots', updateData.screenshots);
    // Media with snake_case aliases
    if (updateData.coverImage !== undefined) assignIfDefined('coverImage', updateData.coverImage);
    if (updateData.cover_image !== undefined) assignIfDefined('coverImage', updateData.cover_image);
    if (updateData.youtubeVideoLink !== undefined) assignIfDefined('youtubeVideoLink', updateData.youtubeVideoLink);
    if (updateData.youtube_video_link !== undefined) assignIfDefined('youtubeVideoLink', updateData.youtube_video_link);
    assignIfDefined('version', updateData.version);
    if (updateData.featured !== undefined) assignIfDefined('featured', Boolean(updateData.featured));
    if (updateData.hidePrice !== undefined) assignIfDefined('hidePrice', Boolean(updateData.hidePrice));
    // Tebex Headless integration fields (nullable, accept null to clear)
    if (updateData.tebexStoreToken !== undefined) assignIfDefined('tebexStoreToken', updateData.tebexStoreToken);
    if (updateData.tebexPackageId !== undefined) assignIfDefined('tebexPackageId', updateData.tebexPackageId);

    console.log('Mapped update object (approved_scripts):', mappedUpdate);

    // Update only the approved_scripts table as requested
    const result = await db.update(approvedScripts)
      .set(mappedUpdate)
      .where(eq(approvedScripts.id, id))
      .returning();

    console.log('Update result (approved_scripts):', result);
    return result[0] ?? null;
  } catch (error) {
    console.error('Error updating script:', error);
    return null;
  }
}

export async function deleteScript(id: number) {
  try {
    // Try to delete from all script tables
    const pendingResult = await db.delete(pendingScripts).where(eq(pendingScripts.id, id)).returning();
    if (pendingResult.length > 0) return true;
    
    const approvedResult = await db.delete(approvedScripts).where(eq(approvedScripts.id, id)).returning();
    if (approvedResult.length > 0) return true;
    
    const rejectedResult = await db.delete(rejectedScripts).where(eq(rejectedScripts.id, id)).returning();
    return rejectedResult.length > 0;
  } catch (error) {
    console.error('Error deleting script:', error);
    return false;
  }
}

// Giveaway functions
export async function createGiveaway(giveawayData: NewGiveaway) {
  console.log('createGiveaway called with:', giveawayData);

  // Provide default values for required fields
  const giveawayWithDefaults = {
    ...giveawayData,
    id: genId(), // app-generated integer PK (prod has manual PKs)
    // Map snake_case input to camelCase schema fields
    totalValue: giveawayData.totalValue || (giveawayData as any).total_value || '0',
    endDate: giveawayData.endDate || (giveawayData as any).end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    startDate: (giveawayData as any).startDate || (giveawayData as any).start_date || null,
    creatorName: giveawayData.creatorName || (giveawayData as any).creator_name || 'Unknown Creator',
    creatorEmail: giveawayData.creatorEmail || (giveawayData as any).creator_email || 'unknown@example.com',
    creatorId: giveawayData.creatorId || (giveawayData as any).creator_id || 'unknown',
    status: giveawayData.status || 'active',
    featured: giveawayData.featured ?? false,
    autoAnnounce: giveawayData.autoAnnounce ?? (giveawayData as any).auto_announce ?? true,
    entriesCount: giveawayData.entriesCount || (giveawayData as any).entries_count || 0,
    maxEntries: giveawayData.maxEntries || (giveawayData as any).max_entries || null,
    // Map currency fields
    currency: giveawayData.currency || (giveawayData as any).currency || 'USD',
    currencySymbol: giveawayData.currencySymbol || (giveawayData as any).currency_symbol || '$',
    // Map media fields
    images: giveawayData.images || (giveawayData as any).images || [],
    videos: giveawayData.videos || (giveawayData as any).videos || [],
    coverImage: giveawayData.coverImage || (giveawayData as any).cover_image || null,
    youtubeVideoLink: giveawayData.youtubeVideoLink || (giveawayData as any).youtube_video_link || null,
    tags: giveawayData.tags || (giveawayData as any).tags || [],
    rules: giveawayData.rules || (giveawayData as any).rules || []
  };
  
  console.log('giveawayWithDefaults:', giveawayWithDefaults);
  
  // Insert into pending_giveaways table (all new giveaways go here)
  const result = await db.insert(pendingGiveaways).values(giveawayWithDefaults).returning({ id: pendingGiveaways.id });
  return result[0]?.id;
}

export async function createGiveawayRequirement(requirementData: NewGiveawayRequirement) {
  console.log('createGiveawayRequirement called with:', requirementData);

  // Map snake_case input to camelCase schema fields
  const mappedData = {
    ...requirementData,
    id: genId(), // app-generated integer PK (prod has manual PKs)
    giveawayId: requirementData.giveawayId || (requirementData as any).giveaway_id
  };
  
  console.log('mappedData:', mappedData);
  
  const result = await db.insert(giveawayRequirements).values(mappedData).returning({ id: giveawayRequirements.id });
  return result[0]?.id;
}

export async function createGiveawayPrize(prizeData: NewGiveawayPrize) {
  console.log('createGiveawayPrize called with:', prizeData);

  // Map snake_case input to camelCase schema fields
  const mappedData = {
    ...prizeData,
    id: genId(), // app-generated integer PK (prod has manual PKs)
    giveawayId: prizeData.giveawayId || (prizeData as any).giveaway_id,
    numberOfWinners: prizeData.numberOfWinners || (prizeData as any).number_of_winners || 1,
    position: prizeData.position || (prizeData as any).position || 1,
  };
  
  console.log('mappedData:', mappedData);
  
  const result = await db.insert(giveawayPrizes).values(mappedData).returning({ id: giveawayPrizes.id });
  return result[0]?.id;
}

export async function getGiveaways(filters?: {
  status?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}) {
  const conditions: any[] = [];
  if (filters?.status && filters.status !== 'all') conditions.push(eq(approvedGiveaways.status, filters.status as any));
  if (filters?.featured) conditions.push(eq(approvedGiveaways.featured, true));
  const base = db.select().from(approvedGiveaways);
  const filtered = conditions.length ? base.where(and(...conditions)) : base;
  const ordered = filtered.orderBy(desc(approvedGiveaways.createdAt));
  const limited = filters?.limit ? ordered.limit(filters.limit) : ordered;
  const offseted = filters?.offset ? limited.offset(filters.offset) : limited;
  const giveaways = await (offseted as any);

  const now = new Date().toISOString();
  const nowTime = new Date(now).getTime();

  // Batch-fetch ALL creators in ONE query (was N+1: one users query per giveaway).
  const creatorIds = Array.from(
    new Set(giveaways.map((g: any) => g.creatorId).filter(Boolean))
  ) as any[];
  const creatorRows = creatorIds.length
    ? await db.select().from(users).where(inArray(users.id, creatorIds))
    : [];
  const creatorMap = new Map(creatorRows.map((u: any) => [u.id, u]));

  // Include all giveaways (both active and upcoming); creator image priority:
  // profile_picture first, then Discord image (handled by getUserProfilePicture).
  const giveawaysWithImages = giveaways.map((giveaway: any) => {
    const creator = giveaway.creatorId ? creatorMap.get(giveaway.creatorId) : null;
    const creatorImage = creator ? getUserProfilePicture(creator) : null;
    const creatorRoles = creator ? creator.roles : null;

    // Determine if giveaway is upcoming (scheduled for future)
    const isUpcoming = giveaway.startDate
      ? new Date(giveaway.startDate).getTime() > nowTime
      : false;

    return {
      ...giveaway,
      creatorImage,
      creatorRoles,
      isUpcoming,
    };
  });

  return giveawaysWithImages;
}

export async function getGiveawayById(id: number, session?: any) {
  // Search across all giveaway tables to find the giveaway
  try {
    let result: any = await db.select().from(approvedGiveaways).where(eq(approvedGiveaways.id, id));
    if (result.length > 0) {
      const giveaway = result[0];
      const requirements = await db.select().from(giveawayRequirements).where(eq(giveawayRequirements.giveawayId, id));
      const prizes = await db.select().from(giveawayPrizes).where(eq(giveawayPrizes.giveawayId, id));
      
      // Fetch winners for ALL prizes in ONE query (was N+1: one query per prize).
      const prizeIds = prizes.map((p) => p.id);
      const allWinners = prizeIds.length
        ? await db.select().from(giveawayPrizeWinners).where(inArray(giveawayPrizeWinners.prizeId, prizeIds))
        : [];
      const winnersByPrize = new Map<number, any[]>();
      for (const w of allWinners) {
        const arr = winnersByPrize.get(w.prizeId) || [];
        arr.push({ userId: w.userId, userName: w.userName, userEmail: w.userEmail, claimed: w.claimed });
        winnersByPrize.set(w.prizeId, arr);
      }
      const prizesWithWinners = prizes.map((prize) => ({
        ...prize,
        winners: winnersByPrize.get(prize.id) || [],
      }));
      
      // Count actual entries from giveaway_entries table
      const actualEntries = await db.select({ count: sql<number>`count(*)` })
        .from(giveawayEntries)
        .where(eq(giveawayEntries.giveawayId, id));
      const actualEntryCount = actualEntries[0]?.count || 0;
      
      // Get user's entry if they have one (for points display)
      let userEntry = null;
      if (session?.user?.id) {
        const userEntryResult = await db.select().from(giveawayEntries)
          .where(and(
            eq(giveawayEntries.giveawayId, id),
            eq(giveawayEntries.userId, (session.user as any).id)
          ))
          .limit(1);
        userEntry = userEntryResult[0] || null;
      }
      
      // Fetch creator's profile picture (with priority) and roles if creatorId exists
      let creatorImage = null;
      let creatorRoles = null;
      if (giveaway.creatorId) {
        const creatorResult = await db.select().from(users).where(eq(users.id, giveaway.creatorId));
        if (creatorResult.length > 0) {
          creatorImage = getUserProfilePicture(creatorResult[0]);
          creatorRoles = creatorResult[0].roles;
        }
      }
      
      return {
        ...giveaway,
        entriesCount: actualEntryCount, // Use actual count instead of stored count
        userEntry, // Include user's entry for points display
        requirements,
        prizes: prizesWithWinners,
        creator_image: creatorImage,
        creator_roles: creatorRoles,
        table_source: 'approved',
      };
    }
    
    result = await db.select().from(pendingGiveaways).where(eq(pendingGiveaways.id, id)) as any;
    if (result.length > 0) {
      const giveaway = result[0];
      const requirements = await db.select().from(giveawayRequirements).where(eq(giveawayRequirements.giveawayId, id));
      const prizes = await db.select().from(giveawayPrizes).where(eq(giveawayPrizes.giveawayId, id));
      
      // Fetch winners for ALL prizes in ONE query (was N+1: one query per prize).
      const prizeIds = prizes.map((p) => p.id);
      const allWinners = prizeIds.length
        ? await db.select().from(giveawayPrizeWinners).where(inArray(giveawayPrizeWinners.prizeId, prizeIds))
        : [];
      const winnersByPrize = new Map<number, any[]>();
      for (const w of allWinners) {
        const arr = winnersByPrize.get(w.prizeId) || [];
        arr.push({ userId: w.userId, userName: w.userName, userEmail: w.userEmail, claimed: w.claimed });
        winnersByPrize.set(w.prizeId, arr);
      }
      const prizesWithWinners = prizes.map((prize) => ({
        ...prize,
        winners: winnersByPrize.get(prize.id) || [],
      }));
      
      // Count actual entries from giveaway_entries table
      const actualEntries = await db.select({ count: sql<number>`count(*)` })
        .from(giveawayEntries)
        .where(eq(giveawayEntries.giveawayId, id));
      const actualEntryCount = actualEntries[0]?.count || 0;
      
      // Fetch creator's profile picture (with priority) and roles if creatorId exists
      let creatorImage = null;
      let creatorRoles = null;
      if (giveaway.creatorId) {
        const creatorResult = await db.select().from(users).where(eq(users.id, giveaway.creatorId));
        if (creatorResult.length > 0) {
          creatorImage = getUserProfilePicture(creatorResult[0]);
          creatorRoles = creatorResult[0].roles;
        }
      }
      
      return {
        ...giveaway,
        entriesCount: actualEntryCount, // Use actual count instead of stored count
        requirements,
        prizes: prizesWithWinners,
        creator_image: creatorImage,
        creator_roles: creatorRoles,
        table_source: 'pending',
      };
    }
    
    result = await db.select().from(rejectedGiveaways).where(eq(rejectedGiveaways.id, id)) as any;
    if (result.length > 0) {
      const giveaway = result[0];
      const requirements = await db.select().from(giveawayRequirements).where(eq(giveawayRequirements.giveawayId, id));
      const prizes = await db.select().from(giveawayPrizes).where(eq(giveawayPrizes.giveawayId, id));
      
      // Fetch winners for ALL prizes in ONE query (was N+1: one query per prize).
      const prizeIds = prizes.map((p) => p.id);
      const allWinners = prizeIds.length
        ? await db.select().from(giveawayPrizeWinners).where(inArray(giveawayPrizeWinners.prizeId, prizeIds))
        : [];
      const winnersByPrize = new Map<number, any[]>();
      for (const w of allWinners) {
        const arr = winnersByPrize.get(w.prizeId) || [];
        arr.push({ userId: w.userId, userName: w.userName, userEmail: w.userEmail, claimed: w.claimed });
        winnersByPrize.set(w.prizeId, arr);
      }
      const prizesWithWinners = prizes.map((prize) => ({
        ...prize,
        winners: winnersByPrize.get(prize.id) || [],
      }));
      
      // Count actual entries from giveaway_entries table
      const actualEntries = await db.select({ count: sql<number>`count(*)` })
        .from(giveawayEntries)
        .where(eq(giveawayEntries.giveawayId, id));
      const actualEntryCount = actualEntries[0]?.count || 0;
      
      // Fetch creator's profile picture (with priority) and roles if creatorId exists
      let creatorImage = null;
      let creatorRoles = null;
      if (giveaway.creatorId) {
        const creatorResult = await db.select().from(users).where(eq(users.id, giveaway.creatorId));
        if (creatorResult.length > 0) {
          creatorImage = getUserProfilePicture(creatorResult[0]);
          creatorRoles = creatorResult[0].roles;
        }
      }
      
      return {
        ...giveaway,
        entriesCount: actualEntryCount, // Use actual count instead of stored count
        requirements,
        prizes: prizesWithWinners,
        creator_image: creatorImage,
        creator_roles: creatorRoles,
        table_source: 'rejected',
      };
    }
    
    // No fallback to legacy table - all giveaways should be in approval system tables
    
    return null;
  } catch (error) {
    console.error('Error in getGiveawayById:', error);
    return null;
  }
}

export async function updateGiveawayForReapproval(id: number, updateData: any) {
  try {
    console.log('updateGiveawayForReapproval called with:', { id, updateData });

    // First, get the current giveaway from approved_giveaways
    const currentGiveaway = await db.select().from(approvedGiveaways).where(eq(approvedGiveaways.id, id)).limit(1);
    
    if (!currentGiveaway[0]) {
      throw new Error('Giveaway not found in approved_giveaways');
    }

    // Map incoming payload keys (may be snake_case) to schema property names
    const mappedUpdate: any = { 
      updatedAt: new Date(),
    };

    const assignIfDefined = (prop: string, value: any) => {
      if (value !== undefined) mappedUpdate[prop] = value;
    };

    // Simple passthrough fields (same casing as schema)
    assignIfDefined('title', updateData.title);
    assignIfDefined('description', updateData.description);
    if (updateData.total_value !== undefined) assignIfDefined('totalValue', updateData.total_value);
    if (updateData.end_date !== undefined) assignIfDefined('endDate', updateData.end_date);
    if (updateData.start_date !== undefined) assignIfDefined('startDate', updateData.start_date);
    if (updateData.start_date !== undefined) assignIfDefined('startDate', updateData.start_date);
    assignIfDefined('currency', updateData.currency);
    if (updateData.currency_symbol !== undefined) assignIfDefined('currencySymbol', updateData.currency_symbol);
    if (updateData.currencySymbol !== undefined) assignIfDefined('currencySymbol', updateData.currencySymbol);
    assignIfDefined('creator_name', updateData.creator_name);
    assignIfDefined('creator_email', updateData.creator_email);
    assignIfDefined('creator_id', updateData.creator_id);
    assignIfDefined('images', updateData.images);
    assignIfDefined('videos', updateData.videos);
    if (updateData.cover_image !== undefined) assignIfDefined('coverImage', updateData.cover_image);
    if (updateData.youtube_video_link !== undefined) assignIfDefined('youtubeVideoLink', updateData.youtube_video_link);
    if (updateData.youtubeVideoLink !== undefined) assignIfDefined('youtubeVideoLink', updateData.youtubeVideoLink);
    assignIfDefined('tags', updateData.tags);
    assignIfDefined('rules', updateData.rules);
    if (updateData.featured !== undefined) assignIfDefined('featured', Boolean(updateData.featured));
    if (updateData.auto_announce !== undefined) assignIfDefined('autoAnnounce', Boolean(updateData.auto_announce));

    console.log('Mapped update object for re-approval:', mappedUpdate);

    // Start a transaction to move giveaway from approved to pending
    const result = await db.transaction(async (tx) => {
      console.log('Transaction started - deleting from approved_giveaways, id:', id);
      
      // 1. Delete from approved_giveaways
      const deleteResult = await tx.delete(approvedGiveaways).where(eq(approvedGiveaways.id, id));
      console.log('Delete result:', deleteResult);
      
      console.log('Inserting into pending_giveaways with data:', {
        ...currentGiveaway[0],
        ...mappedUpdate,
        id: id,
      });
      
      // 2. Insert into pending_giveaways with updated data
      const newPendingGiveaway = await tx.insert(pendingGiveaways)
        .values({
          ...currentGiveaway[0],
          ...mappedUpdate,
          id: id, // Keep the same ID
        })
        .returning();

      console.log('Insert result:', newPendingGiveaway[0]);
      return newPendingGiveaway[0];
    });

    console.log('Giveaway moved to pending for re-approval:', result);
    return result;
  } catch (error) {
    console.error('Error updating giveaway for re-approval:', error);
    throw error;
  }
}

export async function updateGiveaway(id: number, updateData: Partial<NewGiveaway> | any) {
  try {
    const fields = Object.keys(updateData);
    if (fields.length === 0) return null;
    
    // Find the giveaway in any table
    let currentGiveaway: any = await db.select().from(pendingGiveaways).where(eq(pendingGiveaways.id, id)).limit(1);
    if (currentGiveaway.length === 0) {
      currentGiveaway = await db.select().from(approvedGiveaways).where(eq(approvedGiveaways.id, id)).limit(1);
    }
    if (currentGiveaway.length === 0) {
      currentGiveaway = await db.select().from(rejectedGiveaways).where(eq(rejectedGiveaways.id, id)).limit(1);
    }
    
    if (currentGiveaway.length === 0) {
      return null; // Giveaway not found
    }
    
    const giveaway = currentGiveaway[0];
    
    // Normalize giveaway data for pending table (remove table-specific fields)
    const normalizedGiveaway = {
      id: giveaway.id,
      title: giveaway.title,
      description: giveaway.description,
      totalValue: giveaway.totalValue,
      endDate: giveaway.endDate,
      startDate: giveaway.startDate,
      maxEntries: giveaway.maxEntries,
      currency: giveaway.currency || 'USD',
      currencySymbol: giveaway.currencySymbol || '$',
      creatorName: giveaway.creatorName,
      creatorEmail: giveaway.creatorEmail,
      creatorId: giveaway.creatorId,
      images: giveaway.images,
      videos: giveaway.videos,
      coverImage: giveaway.coverImage,
      youtubeVideoLink: giveaway.youtubeVideoLink,
      tags: giveaway.tags,
      rules: giveaway.rules,
      featured: giveaway.featured,
      autoAnnounce: giveaway.autoAnnounce,
      createdAt: giveaway.createdAt,
      updatedAt: new Date(),
      submittedAt: new Date(),
      adminNotes: giveaway.adminNotes
    };
    
    // Map snake_case fields to camelCase schema fields
    const updateObject: any = { 
      updatedAt: new Date(),
      submittedAt: new Date()
    };
    
    // Cast updateData to any to allow both snake_case and camelCase
    const data = updateData as any;
    
    // Map fields from updateData
    if (data.title !== undefined) updateObject.title = data.title;
    if (data.description !== undefined) updateObject.description = data.description;
    if (data.total_value !== undefined) updateObject.totalValue = data.total_value;
    if (data.totalValue !== undefined) updateObject.totalValue = data.totalValue;
    if (data.end_date !== undefined) updateObject.endDate = data.end_date;
    if (data.endDate !== undefined) updateObject.endDate = data.endDate;
    if (data.start_date !== undefined) updateObject.startDate = data.start_date;
    if (data.startDate !== undefined) updateObject.startDate = data.startDate;
    if (data.start_date !== undefined) updateObject.startDate = data.start_date;
    if (data.startDate !== undefined) updateObject.startDate = data.startDate;
    if (data.currency !== undefined) updateObject.currency = data.currency;
    if (data.currency_symbol !== undefined) updateObject.currencySymbol = data.currency_symbol;
    if (data.currencySymbol !== undefined) updateObject.currencySymbol = data.currencySymbol;
    if (data.creator_name !== undefined) updateObject.creatorName = data.creator_name;
    if (data.creatorName !== undefined) updateObject.creatorName = data.creatorName;
    if (data.creator_email !== undefined) updateObject.creatorEmail = data.creator_email;
    if (data.creatorEmail !== undefined) updateObject.creatorEmail = data.creatorEmail;
    if (data.creator_id !== undefined) updateObject.creatorId = data.creator_id;
    if (data.creatorId !== undefined) updateObject.creatorId = data.creatorId;
    if (data.images !== undefined) updateObject.images = data.images;
    if (data.videos !== undefined) updateObject.videos = data.videos;
    if (data.cover_image !== undefined) updateObject.coverImage = data.cover_image;
    if (data.coverImage !== undefined) updateObject.coverImage = data.coverImage;
    if (data.youtube_video_link !== undefined) updateObject.youtubeVideoLink = data.youtube_video_link;
    if (data.youtubeVideoLink !== undefined) updateObject.youtubeVideoLink = data.youtubeVideoLink;
    if (data.tags !== undefined) updateObject.tags = data.tags;
    if (data.rules !== undefined) updateObject.rules = data.rules;
    if (data.featured !== undefined) updateObject.featured = Boolean(data.featured);
    if (data.auto_announce !== undefined) updateObject.autoAnnounce = Boolean(data.auto_announce);
    if (data.autoAnnounce !== undefined) updateObject.autoAnnounce = Boolean(data.autoAnnounce);
    if (data.maxEntries !== undefined) updateObject.maxEntries = data.maxEntries;
    if (data.max_entries !== undefined) updateObject.maxEntries = data.max_entries;
    
    // Always move to pending_giveaways for any edit
    const result = await db.transaction(async (tx) => {
      // Delete from current table
      await tx.delete(pendingGiveaways).where(eq(pendingGiveaways.id, id));
      await tx.delete(approvedGiveaways).where(eq(approvedGiveaways.id, id));
      await tx.delete(rejectedGiveaways).where(eq(rejectedGiveaways.id, id));
      
      // Insert into pending_giveaways with normalized data
      const newPending = await tx.insert(pendingGiveaways)
        .values({
          ...normalizedGiveaway,
          ...updateObject,
          id: id, // Keep the same ID
        })
        .returning();
      
      return newPending[0];
    });
    
    return result;
  } catch (error) {
    console.error('Error updating giveaway:', error);
    return null;
  }
}

export async function deleteGiveaway(id: number) {
  try {
    console.log(`Attempting to delete giveaway with ID: ${id}`);
    
    // Try to delete from pending_giveaways first
    let result = await db.delete(pendingGiveaways).where(eq(pendingGiveaways.id, id)).returning({ id: pendingGiveaways.id });
    if (result.length > 0) {
      console.log(`Found giveaway in pending_giveaways, deleting related data...`);
      // Also delete related entries, requirements and prizes
      const [entriesDeleted, requirementsDeleted, prizesDeleted] = await Promise.all([
        deleteGiveawayEntry(id),
        deleteGiveawayRequirement(id),
        deleteGiveawayPrize(id)
      ]);
      console.log(`Deletion results - Entries: ${entriesDeleted}, Requirements: ${requirementsDeleted}, Prizes: ${prizesDeleted}`);
      return true;
    }

    // Try to delete from approved_giveaways
    result = await db.delete(approvedGiveaways).where(eq(approvedGiveaways.id, id)).returning({ id: approvedGiveaways.id });
    if (result.length > 0) {
      console.log(`Found giveaway in approved_giveaways, deleting related data...`);
      // Also delete related entries, requirements and prizes
      const [entriesDeleted, requirementsDeleted, prizesDeleted] = await Promise.all([
        deleteGiveawayEntry(id),
        deleteGiveawayRequirement(id),
        deleteGiveawayPrize(id)
      ]);
      console.log(`Deletion results - Entries: ${entriesDeleted}, Requirements: ${requirementsDeleted}, Prizes: ${prizesDeleted}`);
      return true;
    }

    // Try to delete from rejected_giveaways
    result = await db.delete(rejectedGiveaways).where(eq(rejectedGiveaways.id, id)).returning({ id: rejectedGiveaways.id });
    if (result.length > 0) {
      console.log(`Found giveaway in rejected_giveaways, deleting related data...`);
      // Also delete related entries, requirements and prizes
      const [entriesDeleted, requirementsDeleted, prizesDeleted] = await Promise.all([
        deleteGiveawayEntry(id),
        deleteGiveawayRequirement(id),
        deleteGiveawayPrize(id)
      ]);
      console.log(`Deletion results - Entries: ${entriesDeleted}, Requirements: ${requirementsDeleted}, Prizes: ${prizesDeleted}`);
      return true;
    }

    // No fallback to legacy table - all giveaways should be in approval system tables

    console.log(`No giveaway found with ID: ${id}`);
    return false;
  } catch (error) {
    console.error('Error deleting giveaway:', error);
    return false;
  }
}

// Admin giveaway management functions
export async function getPendingGiveaways(limit?: number): Promise<any[]> {
  const maxRetries = 3;
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
  const base = db.select().from(pendingGiveaways).orderBy(desc(pendingGiveaways.submittedAt));
  return await (limit ? base.limit(limit) : base) as any[];
    } catch (error: any) {
      lastError = error;
      if (error?.cause?.code === 'XATA_CONCURRENCY_LIMIT' || error?.cause?.code === 'CONNECT_TIMEOUT') {
        const waitTime = attempt * 500;
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      break;
    }
  }
  console.warn('getPendingGiveaways failed after retries:', lastError);
  return [];
}

export async function getApprovedGiveaways(limit?: number): Promise<any[]> {
  const maxRetries = 3;
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
  const base = db.select().from(approvedGiveaways).orderBy(desc(approvedGiveaways.approvedAt));
  return await (limit ? base.limit(limit) : base) as any[];
    } catch (error: any) {
      lastError = error;
      if (error?.cause?.code === 'XATA_CONCURRENCY_LIMIT' || error?.cause?.code === 'CONNECT_TIMEOUT') {
        const waitTime = attempt * 200;
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      break;
    }
  }
  console.warn('getApprovedGiveaways failed after retries:', lastError);
  return [];
}

export async function getRejectedGiveaways(limit?: number): Promise<any[]> {
  const maxRetries = 3;
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
  const base = db.select().from(rejectedGiveaways).orderBy(desc(rejectedGiveaways.rejectedAt));
  return await (limit ? base.limit(limit) : base) as any[];
    } catch (error: any) {
      lastError = error;
      if (error?.cause?.code === 'XATA_CONCURRENCY_LIMIT' || error?.cause?.code === 'CONNECT_TIMEOUT') {
        const waitTime = attempt * 500;
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      break;
    }
  }
  console.warn('getRejectedGiveaways failed after retries:', lastError);
  return [];
}

export async function approveGiveaway(giveawayId: number, adminId: string, adminNotes?: string) {
  try {
    // Get the pending giveaway
    const pendingGiveaway = await db.select().from(pendingGiveaways).where(eq(pendingGiveaways.id, giveawayId));
    if (!pendingGiveaway[0]) {
      throw new Error('Pending giveaway not found');
    }

    // Insert into approved_giveaways table
    await db.insert(approvedGiveaways).values({
      ...pendingGiveaway[0],
      approvedBy: adminId,
      adminNotes: adminNotes || null,
    });

    // Delete from pending_giveaways table
    await db.delete(pendingGiveaways).where(eq(pendingGiveaways.id, giveawayId));

    return true;
  } catch (error) {
    console.error('Error approving giveaway:', error);
    return false;
  }
}

export async function rejectGiveaway(giveawayId: number, adminId: string, rejectionReason: string, adminNotes?: string) {
  try {
    // First try to get from pending giveaways
    let giveaway: any[] = await db.select().from(pendingGiveaways).where(eq(pendingGiveaways.id, giveawayId));
    let sourceTable = 'pending';
    
    // If not found in pending, try approved giveaways
    if (!giveaway[0]) {
      const approvedGiveaway = await db.select().from(approvedGiveaways).where(eq(approvedGiveaways.id, giveawayId));
      if (approvedGiveaway[0]) {
        // Convert approved giveaway to pending giveaway format for rejection
        const approvedData = approvedGiveaway[0];
        giveaway = [{
          ...approvedData,
          submittedAt: approvedData.createdAt, // Use createdAt as submittedAt
          adminNotes: approvedData.adminNotes
        }];
        sourceTable = 'approved';
      }
    }
    
    if (!giveaway[0]) {
      throw new Error('Giveaway not found in pending or approved giveaways');
    }

    // Insert into rejected_giveaways table
    await db.insert(rejectedGiveaways).values({
      ...giveaway[0],
      rejectedBy: adminId,
      rejectionReason: rejectionReason,
      adminNotes: adminNotes || null,
    });

    // Delete from the source table
    if (sourceTable === 'pending') {
      await db.delete(pendingGiveaways).where(eq(pendingGiveaways.id, giveawayId));
    } else {
      await db.delete(approvedGiveaways).where(eq(approvedGiveaways.id, giveawayId));
    }

    return true;
  } catch (error) {
    console.error('Error rejecting giveaway:', error);
    return false;
  }
}

// Giveaway Entry functions
export async function createGiveawayEntry(entryData: NewGiveawayEntry) {
  try {
    console.log('createGiveawayEntry called with:', entryData);

    // Map snake_case input to camelCase schema fields
    const mappedData = {
      ...entryData,
      id: genId(), // app-generated integer PK (prod has manual PKs)
      giveawayId: entryData.giveawayId || (entryData as any).giveaway_id,
      userId: entryData.userId || (entryData as any).user_id,
      userName: (entryData as any).userName ?? (entryData as any).user_name ?? null,
      userEmail: (entryData as any).userEmail ?? (entryData as any).user_email ?? null,
      entryDate: (entryData as any).entryDate ?? (entryData as any).entry_date ?? new Date(),
      pointsEarned: (entryData as any).pointsEarned ?? (entryData as any).points_earned ?? 0,
      requirementsCompleted: (entryData as any).requirementsCompleted ?? (entryData as any).requirements_completed ?? []
    };
    
    console.log('mappedData:', mappedData);
    
    const result = await db.insert(giveawayEntries).values(mappedData).returning({ id: giveawayEntries.id });
    
    // Update the entries count in the approved_giveaways table
    await db.update(approvedGiveaways)
      .set({ 
        entriesCount: sql`${approvedGiveaways.entriesCount} + 1`, 
        updatedAt: new Date() 
      })
      .where(eq(approvedGiveaways.id, mappedData.giveawayId));
    
    return result[0]?.id;
  } catch (error) {
    console.error('Error creating giveaway entry:', error);
    throw error;
  }
}

export async function getGiveawayEntries(giveawayId: number) {
  return await db.select().from(giveawayEntries)
    .where(eq(giveawayEntries.giveawayId, giveawayId))
    .orderBy(desc(giveawayEntries.entryDate));
}

export async function getUserGiveawayEntry(giveawayId: number, userId: string) {
  const result = await db.select().from(giveawayEntries)
    .where(and(
      eq(giveawayEntries.giveawayId, giveawayId),
      eq(giveawayEntries.userId, userId)
    ))
    .limit(1);
  return result[0] ?? null;
}

export async function updateGiveawayEntryPoints(giveawayId: number, userId: string, completedRequirements: number[]) {
  try {
    // Get the giveaway requirements to calculate points
    const requirements = await db.select().from(giveawayRequirements)
      .where(eq(giveawayRequirements.giveawayId, giveawayId));
    
    // Calculate total points for completed requirements
    const totalPoints = requirements
      .filter(req => completedRequirements.includes(req.id))
      .reduce((sum, req) => sum + req.points, 0);
    
    // Update the entry with new points and completed requirements
    const result = await db.update(giveawayEntries)
      .set({
        pointsEarned: totalPoints,
        requirementsCompleted: completedRequirements.map(id => id.toString()),
        updatedAt: new Date()
      })
      .where(and(
        eq(giveawayEntries.giveawayId, giveawayId),
        eq(giveawayEntries.userId, userId)
      ))
      .returning({ id: giveawayEntries.id });
    
    return result[0]?.id;
  } catch (error) {
    console.error('Error updating giveaway entry points:', error);
    throw error;
  }
}


// Ad functions - using new approval system

// Create ad (routes to pending or approved based on user role)
export async function createAd(adData: NewAd & { status?: string }) {
  const slotUniqueId = (adData as any).slotUniqueId ?? (adData as any).slot_unique_id ?? null;
  
  // If slotUniqueId is provided, inherit the slot's endDate.
  let adEndDate = (adData as any).endDate ?? (adData as any).end_date ?? null;
  if (slotUniqueId) {
    console.log('createAd: Looking up slot with uniqueId:', slotUniqueId);
    const slot = await getSlotByUniqueId(slotUniqueId);
    if (slot) {
      console.log('createAd: Found slot:', { id: slot.id, endDate: slot.endDate, status: slot.status });
      if (slot.endDate) {
        // Use the slot's endDate from PayPal (same date for all ads in this slot)
        adEndDate = slot.endDate;
        console.log('createAd: Using slot endDate:', adEndDate);
      } else {
        console.warn('createAd: Slot found but has no endDate:', slot.id);
      }
    } else {
      console.warn('createAd: Slot not found for uniqueId:', slotUniqueId);
    }
  } else {
    console.log('createAd: No slotUniqueId provided, using provided endDate or null');
  }

  // Map snake_case input to camelCase schema fields and provide defaults
  const mapped = {
    id: genId(), // app-generated integer PK (prod has manual PKs)
    title: (adData as any).title,
    description: (adData as any).description,
    imageUrl: (adData as any).imageUrl ?? (adData as any).image_url ?? null,
    linkUrl: (adData as any).linkUrl ?? (adData as any).link_url ?? null,
    category: (adData as any).category,
    slotUniqueId: slotUniqueId,
    startDate: (adData as any).startDate ?? (adData as any).start_date ?? new Date(),
    endDate: adEndDate,
    createdBy: (adData as any).createdBy ?? (adData as any).created_by,
  };

  // If status is 'active', insert directly into approved_ads
  if (adData.status === 'active') {
    const result = await db.insert(approvedAds).values({
      ...mapped,
      status: 'active' as any,
      approvedAt: new Date(),
      approvedBy: mapped.createdBy,
    } as any).returning({ id: approvedAds.id });
    return result[0]?.id;
  } else {
    // Otherwise, insert into pending_ads
    const result = await db.insert(pendingAds).values({
      ...mapped,
    } as any).returning({ id: pendingAds.id });
    return result[0]?.id;
  }
}

// Create pending ad (for user submissions)
export async function createPendingAd(adData: NewAd) {
  const slotUniqueId = (adData as any).slotUniqueId ?? (adData as any).slot_unique_id ?? null;
  
  // If slotUniqueId is provided, get the slot's endDate from PayPal
  let adEndDate = (adData as any).endDate ?? (adData as any).end_date ?? null;
  if (slotUniqueId) {
    console.log('createPendingAd: Looking up slot with uniqueId:', slotUniqueId);
    const slot = await getSlotByUniqueId(slotUniqueId);
    if (slot) {
      console.log('createPendingAd: Found slot:', { id: slot.id, endDate: slot.endDate, status: slot.status });
      if (slot.endDate) {
        // Use the slot's endDate from PayPal (same date for all ads in this slot)
        adEndDate = slot.endDate;
        console.log('createPendingAd: Using slot endDate:', adEndDate);
      } else {
        console.warn('createPendingAd: Slot found but has no endDate:', slot.id);
      }
    } else {
      console.warn('createPendingAd: Slot not found for uniqueId:', slotUniqueId);
    }
  } else {
    console.log('createPendingAd: No slotUniqueId provided, using provided endDate or null');
  }

  // Map snake_case input to camelCase schema fields and provide defaults
  const mapped = {
    id: genId(), // app-generated integer PK (prod has manual PKs)
    title: (adData as any).title,
    description: (adData as any).description,
    imageUrl: (adData as any).imageUrl ?? (adData as any).image_url ?? null,
    linkUrl: (adData as any).linkUrl ?? (adData as any).link_url ?? null,
    category: (adData as any).category,
    slotUniqueId: slotUniqueId,
    startDate: (adData as any).startDate ?? (adData as any).start_date ?? new Date(),
    endDate: adEndDate,
    createdBy: (adData as any).createdBy ?? (adData as any).created_by,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Insert into pending ads table
  const result = await db.insert(pendingAds).values(mapped as any).returning({ id: pendingAds.id });
  return result[0]?.id;
}

export async function getAds(filters?: {
  status?: string;
  category?: string;
  limit?: number;
}) {
  try {
    // Fetch from approved ads table only
    const conditions: any[] = [];
    if (filters?.status) conditions.push(eq(approvedAds.status, filters.status as any));
    if (filters?.category) conditions.push(eq(approvedAds.category, filters.category));
    // Always filter out inactive ads (both status and slotStatus must be active)
    if (filters?.status === 'active' || !filters?.status) {
      conditions.push(eq(approvedAds.status, 'active'));
      conditions.push(eq(approvedAds.slotStatus, 'active'));
    }
    
    const limitVal = filters?.limit || 50;
    
    const query = conditions.length
      ? db.select().from(approvedAds).where(and(...conditions))
      : db.select().from(approvedAds).where(
          and(
            eq(approvedAds.status, 'active'),
            eq(approvedAds.slotStatus, 'active')
          )
        );
    
    const results = await query
      .orderBy(desc(approvedAds.createdAt))
      .limit(limitVal) as any[];
    
    // Map results to set status to 'approved' for consistency with getAdById
    return results.map(ad => ({
      ...ad,
      status: 'approved'
    }));
      
  } catch (error: any) {
    console.error('Error fetching ads:', error);
    throw error;
  }
}

// Helper function to get ads for specific page types
export async function getAdsForPage(pageType: 'scripts' | 'giveaways' | 'props', limit?: number) {
  try {
    const allAds = await getAds({ status: "active", limit: 100 });

    // Each page shows ads tagged "both"/"general" plus that page's own category.
    const pageCategory = pageType.toLowerCase();
    const filteredAds = allAds.filter((ad: any) => {
      const c = ad.category?.toLowerCase();
      return c === "both" || c === "general" || c === pageCategory;
    });

    // Apply limit
    const limitVal = limit || 10;
    return filteredAds.slice(0, limitVal);
    
  } catch (error: any) {
    console.error(`Error fetching ads for ${pageType}:`, error);
    throw error;
  }
}

// Old ad functions removed - using new approval system with pending_ads, approved_ads, rejected_ads

// Admin ad management functions
export async function getPendingAds(limit?: number): Promise<any[]> {
  const base = db
    .select({
      id: pendingAds.id,
      title: pendingAds.title,
      description: pendingAds.description,
      imageUrl: pendingAds.imageUrl,
      linkUrl: pendingAds.linkUrl,
      category: pendingAds.category,
      startDate: pendingAds.startDate,
      endDate: pendingAds.endDate,
      createdBy: pendingAds.createdBy,
      createdAt: pendingAds.createdAt,
      updatedAt: pendingAds.updatedAt,
      slotStatus: pendingAds.slotStatus,
      adminNotes: pendingAds.adminNotes,
      creator_name: users.name,
      creator_email: users.email,
      creator_id: users.id,
    })
    .from(pendingAds)
    .leftJoin(users, eq(pendingAds.createdBy, users.id))
    .where(eq(pendingAds.slotStatus, 'active'))
    .orderBy(desc(pendingAds.createdAt));
  return await (limit ? base.limit(limit) : base) as any[];
}

export async function getApprovedAds(limit?: number): Promise<any[]> {
  const base = db
    .select({
      id: approvedAds.id,
      title: approvedAds.title,
      description: approvedAds.description,
      imageUrl: approvedAds.imageUrl,
      linkUrl: approvedAds.linkUrl,
      category: approvedAds.category,
      startDate: approvedAds.startDate,
      endDate: approvedAds.endDate,
      createdBy: approvedAds.createdBy,
      createdAt: approvedAds.createdAt,
      updatedAt: approvedAds.updatedAt,
      status: approvedAds.status,
      slotStatus: approvedAds.slotStatus,
      approvedAt: approvedAds.approvedAt,
      approvedBy: approvedAds.approvedBy,
      adminNotes: approvedAds.adminNotes,
      clickCount: approvedAds.clickCount,
      viewCount: approvedAds.viewCount,
      creator_name: users.name,
      creator_email: users.email,
      creator_id: users.id,
    })
    .from(approvedAds)
    .leftJoin(users, eq(approvedAds.createdBy, users.id))
    .where(
      and(
        eq(approvedAds.status, 'active'),
        eq(approvedAds.slotStatus, 'active')
      )
    )
    .orderBy(desc(approvedAds.approvedAt));
  const results = await (limit ? base.limit(limit) : base) as any[];
  
  // Map results to set status to 'approved' for consistency with getAdById
  return results.map(ad => ({
    ...ad,
    status: 'approved'
  }));
}

export async function getRejectedAds(limit?: number): Promise<any[]> {
  const base = db
    .select({
      id: rejectedAds.id,
      title: rejectedAds.title,
      description: rejectedAds.description,
      imageUrl: rejectedAds.imageUrl,
      linkUrl: rejectedAds.linkUrl,
      category: rejectedAds.category,
      startDate: rejectedAds.startDate,
      endDate: rejectedAds.endDate,
      createdBy: rejectedAds.createdBy,
      createdAt: rejectedAds.createdAt,
      updatedAt: rejectedAds.updatedAt,
      slotStatus: rejectedAds.slotStatus,
      rejectedAt: rejectedAds.rejectedAt,
      rejectedBy: rejectedAds.rejectedBy,
      rejectionReason: rejectedAds.rejectionReason,
      adminNotes: rejectedAds.adminNotes,
      creator_name: users.name,
      creator_email: users.email,
      creator_id: users.id,
    })
    .from(rejectedAds)
    .leftJoin(users, eq(rejectedAds.createdBy, users.id))
    .where(eq(rejectedAds.slotStatus, 'active'))
    .orderBy(desc(rejectedAds.rejectedAt));
  return await (limit ? base.limit(limit) : base) as any[];
}

export async function approveAd(adId: number, adminId: string, adminNotes?: string) {
  // Move from pending to approved
  const pending = await db.select().from(pendingAds).where(eq(pendingAds.id, adId)).limit(1);
  if (pending.length === 0) throw new Error('Pending ad not found');
  const ad = pending[0];
  
  // Create the approved ad with all required fields
  await db.insert(approvedAds).values({
    id: ad.id,
    title: ad.title,
    description: ad.description,
    imageUrl: ad.imageUrl,
    linkUrl: ad.linkUrl,
    category: ad.category,
    slotUniqueId: ad.slotUniqueId,
    startDate: ad.startDate,
    endDate: ad.endDate,
    createdBy: ad.createdBy,
    createdAt: ad.createdAt,
    updatedAt: new Date(),
    status: 'active',
    approvedAt: new Date(),
    approvedBy: adminId,
    adminNotes: adminNotes || null,
  });
  await db.delete(pendingAds).where(eq(pendingAds.id, adId));
  return true;
}

export async function rejectAd(adId: number, adminId: string, rejectionReason: string, adminNotes?: string) {
  try {
    // First try to get from pending ads
    let ad: any[] = await db.select().from(pendingAds).where(eq(pendingAds.id, adId)).limit(1) as any;
    let sourceTable = 'pending';
    
    // If not found in pending, try approved ads
    if (ad.length === 0) {
      const approvedAd = await db.select().from(approvedAds).where(eq(approvedAds.id, adId)).limit(1);
      if (approvedAd.length > 0) {
        // Convert approved ad to pending ad format for rejection
        const approvedData = approvedAd[0];
        ad = [{
          ...approvedData,
          submittedAt: approvedData.createdAt, // Use createdAt as submittedAt
          adminNotes: approvedData.adminNotes
        }];
        sourceTable = 'approved';
      }
    }
    
    // If still not found, check if it's already rejected
    if (ad.length === 0) {
      const rejectedAd = await db.select().from(rejectedAds).where(eq(rejectedAds.id, adId)).limit(1);
      if (rejectedAd.length > 0) {
        throw new Error(`Ad ${adId} is already rejected`);
      }
    }
    
    if (ad.length === 0) {
      throw new Error(`Ad ${adId} not found in pending, approved, or rejected ads`);
    }
    
    const adData = ad[0];
    
    // Insert into rejected_ads table
    await db.insert(rejectedAds).values({
      id: adData.id,
      title: adData.title,
      description: adData.description,
      imageUrl: adData.imageUrl,
      linkUrl: adData.linkUrl,
      category: adData.category,
      startDate: adData.startDate,
      endDate: adData.endDate,
      createdBy: adData.createdBy,
      createdAt: adData.createdAt,
      updatedAt: new Date(),
      rejectedAt: new Date(),
      rejectedBy: adminId,
      rejectionReason,
      adminNotes: adminNotes || null,
    });
    
    // Delete from the source table
    if (sourceTable === 'pending') {
      await db.delete(pendingAds).where(eq(pendingAds.id, adId));
    } else {
      await db.delete(approvedAds).where(eq(approvedAds.id, adId));
    }
    
    return true;
  } catch (error) {
    console.error('Error rejecting ad:', error);
    throw error;
  }
}

// Ad management functions
export async function getAdById(id: number) {
  try {
    // Search across all ad tables
    const approved = await db.select().from(approvedAds).where(eq(approvedAds.id, id)).limit(1);
    if (approved.length > 0) return { ...approved[0], status: 'approved' };
    
    const pending = await db.select().from(pendingAds).where(eq(pendingAds.id, id)).limit(1);
    if (pending.length > 0) return { ...pending[0], status: 'pending' };
    
    const rejected = await db.select().from(rejectedAds).where(eq(rejectedAds.id, id)).limit(1);
    if (rejected.length > 0) return { ...rejected[0], status: 'rejected' };
    
    return null;
  } catch (error) {
    console.error('Error fetching ad:', error);
    return null;
  }
}

export async function updateAd(id: number, updateData: any) {
  try {
    // Update in approved ads table (most common case)
    const result = await db.update(approvedAds)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(approvedAds.id, id))
      .returning();
    
    if (result.length > 0) return result[0];
    
    // Try pending ads
    const pendingResult = await db.update(pendingAds)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(pendingAds.id, id))
      .returning();
    
    return pendingResult[0] || null;
  } catch (error) {
    console.error('Error updating ad:', error);
    return null;
  }
}

// Increment click count for an approved ad
export async function incrementAdClickCount(adId: number): Promise<boolean> {
  try {
    const result = await db
      .update(approvedAds)
      .set({ 
        clickCount: sql`${approvedAds.clickCount} + 1`,
        updatedAt: new Date() 
      })
      .where(eq(approvedAds.id, adId))
      .returning();
    
    if (result.length === 0) {
      console.error(`[incrementAdClickCount] No ad found with id: ${adId}`);
      return false;
    }
    
    console.log(`[incrementAdClickCount] Successfully incremented click count for ad ${adId}. New count: ${result[0]?.clickCount}`);
    return true;
  } catch (error) {
    console.error(`[incrementAdClickCount] Error incrementing ad click count for ad ${adId}:`, error);
    return false;
  }
}

// Increment view count for an approved ad (when ad is displayed on page)
export async function incrementAdViewCount(adId: number): Promise<boolean> {
  try {
    const result = await db
      .update(approvedAds)
      .set({ 
        viewCount: sql`${approvedAds.viewCount} + 1`,
        updatedAt: new Date() 
      })
      .where(eq(approvedAds.id, adId))
      .returning();
    
    if (result.length === 0) {
      console.error(`[incrementAdViewCount] No ad found with id: ${adId}`);
      return false;
    }
    
    console.log(`[incrementAdViewCount] Successfully incremented view count for ad ${adId}. New count: ${result[0]?.viewCount}`);
    return true;
  } catch (error) {
    console.error(`[incrementAdViewCount] Error incrementing ad view count for ad ${adId}:`, error);
    return false;
  }
}

// Update an existing pending ad in-place
export async function updatePendingAd(id: number, updateData: any) {
  try {
    console.log('updatePendingAd called with:', { id, updateData });

    const mappedUpdate: any = { updatedAt: new Date() };
    const assignIfDefined = (prop: string, value: any) => {
      if (value !== undefined) mappedUpdate[prop] = value;
    };

    assignIfDefined('title', updateData.title);
    assignIfDefined('description', updateData.description);
    assignIfDefined('imageUrl', updateData.image_url);
    assignIfDefined('linkUrl', updateData.link_url);
    assignIfDefined('category', updateData.category);
    // priority removed

    const result = await db.update(pendingAds)
      .set(mappedUpdate)
      .where(eq(pendingAds.id, id))
      .returning();

    return result[0] ?? null;
  } catch (error) {
    console.error('Error updating pending ad:', error);
    throw error;
  }
}

// Move an approved ad back to pending for re-approval, applying updates
export async function updateApprovedAdForReapproval(id: number, updateData: any) {
  try {
    console.log('updateApprovedAdForReapproval called with:', { id, updateData });

    const currentAd = await db.select().from(approvedAds).where(eq(approvedAds.id, id)).limit(1);
    if (!currentAd[0]) {
      throw new Error('Ad not found in approved_ads');
    }

    const mappedUpdate: any = {
      updatedAt: new Date(),
    };
    const assignIfDefined = (prop: string, value: any) => {
      if (value !== undefined) mappedUpdate[prop] = value;
    };

    assignIfDefined('title', updateData.title);
    assignIfDefined('description', updateData.description);
    assignIfDefined('imageUrl', updateData.image_url);
    assignIfDefined('linkUrl', updateData.link_url);
    assignIfDefined('category', updateData.category);
    // priority removed

    const result = await db.transaction(async (tx) => {
      await tx.delete(approvedAds).where(eq(approvedAds.id, id));
      const inserted = await tx.insert(pendingAds)
        .values({
          ...currentAd[0],
          ...mappedUpdate,
          id,
        })
        .returning();
      return inserted[0];
    });

    return result ?? null;
  } catch (error) {
    console.error('Error moving approved ad to pending:', error);
    throw error;
  }
}

// Move a rejected ad back to pending for re-approval, applying updates
export async function updateRejectedAdForReapproval(id: number, updateData: any) {
  try {
    console.log('updateRejectedAdForReapproval called with:', { id, updateData });

    const currentAd = await db.select().from(rejectedAds).where(eq(rejectedAds.id, id)).limit(1);
    if (!currentAd[0]) {
      throw new Error('Ad not found in rejected_ads');
    }

    const mappedUpdate: any = {
      updatedAt: new Date(),
    };
    const assignIfDefined = (prop: string, value: any) => {
      if (value !== undefined) mappedUpdate[prop] = value;
    };

    assignIfDefined('title', updateData.title);
    assignIfDefined('description', updateData.description);
    assignIfDefined('imageUrl', updateData.image_url);
    assignIfDefined('linkUrl', updateData.link_url);
    assignIfDefined('category', updateData.category);
    // priority removed

    const result = await db.transaction(async (tx) => {
      await tx.delete(rejectedAds).where(eq(rejectedAds.id, id));
      const inserted = await tx.insert(pendingAds)
        .values({
          ...currentAd[0],
          ...mappedUpdate,
          id,
        })
        .returning();
      return inserted[0];
    });

    return result ?? null;
  } catch (error) {
    console.error('Error moving rejected ad to pending:', error);
    throw error;
  }
}

export async function deleteAd(id: number) {
  try {
    console.log(`Attempting to delete ad with ID: ${id}`);
    
    // First check which table contains the ad
    const approvedAd = await db.select().from(approvedAds).where(eq(approvedAds.id, id)).limit(1);
    if (approvedAd.length > 0) {
      console.log(`Found ad in approved_ads, deleting...`);
      const result = await db.delete(approvedAds).where(eq(approvedAds.id, id)).returning();
      return result.length > 0;
    }
    
    const pendingAd = await db.select().from(pendingAds).where(eq(pendingAds.id, id)).limit(1);
    if (pendingAd.length > 0) {
      console.log(`Found ad in pending_ads, deleting...`);
      const result = await db.delete(pendingAds).where(eq(pendingAds.id, id)).returning();
      return result.length > 0;
    }
    
    const rejectedAd = await db.select().from(rejectedAds).where(eq(rejectedAds.id, id)).limit(1);
    if (rejectedAd.length > 0) {
      console.log(`Found ad in rejected_ads, deleting...`);
      const result = await db.delete(rejectedAds).where(eq(rejectedAds.id, id)).returning();
      return result.length > 0;
    }
    
    console.log(`Ad with ID ${id} not found in any table`);
    return false;
  } catch (error) {
    console.error('Error deleting ad:', error);
    return false;
  }
}

// Giveaway requirements and prizes functions
export async function getGiveawayRequirements(giveawayId: number): Promise<any[]> {
  try {
    return await db.select().from(giveawayRequirements).where(eq(giveawayRequirements.giveawayId, giveawayId));
  } catch (error) {
    console.error('Error fetching giveaway requirements:', error);
    return [];
  }
}

export async function getGiveawayPrizes(giveawayId: number): Promise<any[]> {
  try {
    return await db.select().from(giveawayPrizes).where(eq(giveawayPrizes.giveawayId, giveawayId));
  } catch (error) {
    console.error('Error fetching giveaway prizes:', error);
    return [];
  }
}

// Delete giveaway requirements and prizes functions
export async function deleteGiveawayEntry(giveawayId: number): Promise<boolean> {
  try {
    await db.delete(giveawayEntries).where(eq(giveawayEntries.giveawayId, giveawayId));
    return true;
  } catch (error) {
    console.error('Error deleting giveaway entries:', error);
    return false;
  }
}

export async function deleteGiveawayRequirement(giveawayId: number): Promise<boolean> {
  try {
    await db.delete(giveawayRequirements).where(eq(giveawayRequirements.giveawayId, giveawayId));
    return true;
  } catch (error) {
    console.error('Error deleting giveaway requirements:', error);
    return false;
  }
}

export async function deleteGiveawayPrize(giveawayId: number): Promise<boolean> {
  try {
    await db.delete(giveawayPrizes).where(eq(giveawayPrizes.giveawayId, giveawayId));
    return true;
  } catch (error) {
    console.error('Error deleting giveaway prizes:', error);
    return false;
  }
}

// Get related giveaways (other active giveaways excluding the current one)
export async function getRelatedGiveaways(currentGiveawayId: number, limit: number = 3) {
  try {
    const result = await db.select().from(approvedGiveaways)
      .where(and(
        eq(approvedGiveaways.status, 'active'),
        ne(approvedGiveaways.id, currentGiveawayId)
      ))
      .limit(limit);

    // Get entry counts for each giveaway
    const giveawaysWithCounts = await Promise.all(
      result.map(async (giveaway) => {
        const entryCount = await db.select({ count: sql<number>`count(*)` })
          .from(giveawayEntries)
          .where(eq(giveawayEntries.giveawayId, giveaway.id));
        
        return {
          ...giveaway,
          entriesCount: entryCount[0]?.count || 0
        };
      })
    );

    return giveawaysWithCounts;
  } catch (error) {
    console.error('Error fetching related giveaways:', error);
    return [];
  }
}

// Featured Scripts Functions - Similar to ads but for featuring user scripts

// Generate unique slot ID for featured scripts
function generateFeaturedScriptSlotUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `featured_script_slot_${timestamp}_${random}`;
}

// Get the next available slot number for a user's featured script slots
async function getNextFeaturedScriptSlotNumber(userId: string): Promise<number> {
  const allSlots = await db
    .select()
    .from(userFeaturedScriptSlots)
    .where(eq(userFeaturedScriptSlots.featuredUserId, userId));

  if (allSlots.length === 0) {
    return 1; // First slot
  }

  let maxSlotNumber = 0;
  for (const slot of allSlots) {
    const slotNumbers = (slot.featuredSlotNumber || []) as number[];
    if (slotNumbers.length > 0) {
      const maxInSlot = Math.max(...slotNumbers);
      if (maxInSlot > maxSlotNumber) {
        maxSlotNumber = maxInSlot;
      }
    }
  }

  return maxSlotNumber + 1;
}

// Get count of active featured script slots for a user
export async function getUserActiveFeaturedScriptSlots(userId: string): Promise<number> {
  try {
    const activeSlots = await db
      .select()
      .from(userFeaturedScriptSlots)
      .where(
        and(
          eq(userFeaturedScriptSlots.featuredUserId, userId),
          eq(userFeaturedScriptSlots.featuredSlotStatus, 'active')
        )
      );
    
    let totalSlots = 0;
    for (const slot of activeSlots) {
      const slotNumbers = (slot.featuredSlotNumber || []) as number[];
      totalSlots += slotNumbers.length;
    }
    
    return totalSlots;
  } catch (error) {
    console.error('Error in getUserActiveFeaturedScriptSlots:', error);
    return 0;
  }
}

// Create featured script slots with proper slot numbers and unique IDs
export async function createFeaturedScriptSlots(
  userId: string,
  slotsToAdd: number,
  orderRefIds: string[],
  packageId: string,
  durationMonths: number,
  durationWeeks?: number // Optional: if provided, use weeks instead of months
): Promise<{ id: number; slotNumber: number[]; slotUniqueIds: string[] }> {
  if (orderRefIds.length !== slotsToAdd) {
    throw new Error('Order reference IDs count must match slots to add');
  }

  if (!['starter', 'premium', 'executive'].includes(packageId)) {
    throw new Error('Invalid package ID. Must be starter, premium, or executive');
  }

  // If durationWeeks is provided, validate it; otherwise validate months
  if (durationWeeks !== undefined) {
    if (![1, 2, 4, 8].includes(durationWeeks)) {
      throw new Error('Invalid duration. Must be 1, 2, 4, or 8 weeks');
    }
  } else {
    if (![1, 3, 6, 12].includes(durationMonths)) {
      throw new Error('Invalid duration. Must be 1, 3, 6, or 12 months');
    }
  }

  const now = new Date();
  const endDate = new Date(now);
  
  // If weeks are provided, calculate endDate based on weeks (days)
  if (durationWeeks !== undefined) {
    endDate.setDate(endDate.getDate() + (durationWeeks * 7));
  } else {
    // Otherwise use months
    endDate.setMonth(endDate.getMonth() + durationMonths);
  }

  const startingSlotNumber = await getNextFeaturedScriptSlotNumber(userId);

  const slotNumbers: number[] = [];
  for (let i = 0; i < slotsToAdd; i++) {
    slotNumbers.push(startingSlotNumber + i);
  }

  const slotUniqueIds: string[] = [];
  for (let i = 0; i < slotsToAdd; i++) {
    slotUniqueIds.push(generateFeaturedScriptSlotUniqueId());
  }

  const orderReference = orderRefIds[0] || null;

  // Store weeks if provided, otherwise store months (for backward compatibility)
  const storedDurationWeeks = durationWeeks !== undefined ? durationWeeks : null;

  const result = await db
    .insert(userFeaturedScriptSlots)
    .values({
      id: genId(), // app-generated integer PK (prod has manual PKs)
      featuredUserId: userId,
      featuredSlotNumber: slotNumbers,
      featuredSlotUniqueIds: slotUniqueIds,
      featuredPurchaseDate: now,
      featuredSlotEndDate: endDate,
      featuredPackageId: packageId,
      featuredDurationWeeks: storedDurationWeeks,
      featuredPaypalOrderId: orderReference,
      featuredSlotStatus: 'active' as const,
    } as any)
    .returning({ 
      id: userFeaturedScriptSlots.id,
      slotNumber: userFeaturedScriptSlots.featuredSlotNumber,
      slotUniqueIds: userFeaturedScriptSlots.featuredSlotUniqueIds
    });

  if (!result[0]) {
    throw new Error('Failed to create featured script slots');
  }

  return {
    id: result[0].id,
    slotNumber: (result[0].slotNumber || []) as number[],
    slotUniqueIds: (result[0].slotUniqueIds || []) as string[]
  };
}

// Get all featured script slots for a user
export async function getUserFeaturedScriptSlots(userId: string) {
  return await db
    .select()
    .from(userFeaturedScriptSlots)
    .where(eq(userFeaturedScriptSlots.featuredUserId, userId))
    .orderBy(desc(userFeaturedScriptSlots.featuredPurchaseDate));
}

// Get slot by slotUniqueId
export async function getFeaturedScriptSlotByUniqueId(slotUniqueId: string) {
  const allSlots = await db
    .select()
    .from(userFeaturedScriptSlots);
  
  const slot = allSlots.find(s => {
    const uniqueIds = (s.featuredSlotUniqueIds || []) as string[];
    return uniqueIds.includes(slotUniqueId);
  });
  
  return slot || null;
}

// Create featured script (no approval needed - users can only feature approved scripts)
export async function createFeaturedScript(featuredScriptData: NewFeaturedScript) {
  const slotUniqueId = (featuredScriptData as any).slotUniqueId ?? (featuredScriptData as any).slot_unique_id ?? null;
  
  let featuredScriptEndDate = (featuredScriptData as any).endDate ?? (featuredScriptData as any).end_date ?? null;
  if (slotUniqueId) {
    const slot = await getFeaturedScriptSlotByUniqueId(slotUniqueId);
    if (slot && slot.featuredSlotEndDate) {
      featuredScriptEndDate = slot.featuredSlotEndDate;
    }
  }

  const scriptId = (featuredScriptData as any).scriptId ?? (featuredScriptData as any).script_id;

  const mapped = {
    id: genId(), // app-generated integer PK (prod has manual PKs)
    scriptId: scriptId,
    featuredSlotUniqueId: slotUniqueId,
    featuredStartDate: (featuredScriptData as any).startDate ?? (featuredScriptData as any).start_date ?? new Date(),
    featuredEndDate: featuredScriptEndDate || null,
    featuredCreatedBy: (featuredScriptData as any).createdBy ?? (featuredScriptData as any).created_by,
    featuredStatus: 'active' as any,
  };

  const result = await db.insert(featuredScripts).values(mapped as any).returning({ id: featuredScripts.id });
  
  // Send Discord notification for featured script
  if (result[0]?.id && scriptId) {
    try {
      // Get the script details
      const script = await db.select()
        .from(approvedScripts)
        .where(eq(approvedScripts.id, scriptId))
        .limit(1);
      
      if (script[0]) {
        const scriptData = script[0];
        const creatorId = mapped.featuredCreatedBy;
        
        // Get seller and creator details
        const [seller, creator] = await Promise.all([
          scriptData.sellerId ? getUserById(scriptData.sellerId) : null,
          creatorId ? getUserById(creatorId) : null
        ]);
        
        if (seller && creator) {
          await announceScriptFeatured(
            {
              id: scriptData.id,
              title: scriptData.title,
              coverImage: scriptData.coverImage,
              sellerId: scriptData.sellerId,
            },
            {
              id: seller.id,
              name: seller.name,
            },
            {
              id: creator.id,
              name: creator.name,
            }
          );
        }
      }
    } catch (discordError) {
      console.error('Failed to send Discord notification for featured script:', discordError);
      // Don't fail the feature creation if Discord notification fails
    }
  }
  
  return result[0]?.id;
}

// Get featured scripts
export async function getFeaturedScripts(filters?: {
  status?: string;
  limit?: number;
}) {
  try {
    const conditions: any[] = [];
    if (filters?.status) conditions.push(eq(featuredScripts.featuredStatus, filters.status as any));
    
    const limitVal = filters?.limit || 50;
    
    const query = conditions.length
      ? db.select().from(featuredScripts).where(and(...conditions))
      : db.select().from(featuredScripts);
    
    const results = await query
      .orderBy(desc(featuredScripts.featuredCreatedAt))
      .limit(limitVal) as any[];
    
    return results;
      
  } catch (error: any) {
    console.error('Error fetching featured scripts:', error);
    throw error;
  }
}

// Get all featured scripts with script details (for public display)
export async function getFeaturedScriptsWithDetails(filters?: {
  status?: string;
  limit?: number;
}) {
  try {
    const conditions: any[] = [];
    // Default to active status for public display
    const statusFilter = filters?.status || 'active';
    conditions.push(eq(featuredScripts.featuredStatus, statusFilter as any));
    // Also filter out inactive slots
    if (statusFilter === 'active') {
      conditions.push(eq(featuredScripts.featuredSlotStatus, 'active'));
    }
    
    const limitVal = filters?.limit || 50;
    
    const results = await db
      .select({
        // Featured script fields
        id: featuredScripts.id,
        scriptId: featuredScripts.scriptId,
        featuredSlotUniqueId: featuredScripts.featuredSlotUniqueId,
        featuredSlotStatus: featuredScripts.featuredSlotStatus,
        featuredStartDate: featuredScripts.featuredStartDate,
        featuredEndDate: featuredScripts.featuredEndDate,
        featuredCreatedBy: featuredScripts.featuredCreatedBy,
        featuredStatus: featuredScripts.featuredStatus,
        featuredClickCount: featuredScripts.featuredClickCount,
        featuredViewCount: featuredScripts.featuredViewCount,
        featuredCreatedAt: featuredScripts.featuredCreatedAt,
        featuredUpdatedAt: featuredScripts.featuredUpdatedAt,
        // Script fields
        scriptTitle: approvedScripts.title,
        scriptDescription: approvedScripts.description,
        scriptCoverImage: approvedScripts.coverImage,
        scriptPrice: approvedScripts.price,
        scriptCategory: approvedScripts.category,
        scriptFramework: approvedScripts.framework,
        scriptSellerName: approvedScripts.seller_name,
        scriptSellerId: approvedScripts.sellerId,
        scriptCurrencySymbol: approvedScripts.currencySymbol,
        scriptFree: approvedScripts.free,
      })
      .from(featuredScripts)
      .leftJoin(approvedScripts, eq(featuredScripts.scriptId, approvedScripts.id))
      .where(and(...conditions))
      .orderBy(desc(featuredScripts.featuredCreatedAt))
      .limit(limitVal);

    // Fetch seller roles and images for all scripts with sellerId
    const sellerIds = results
      .map(r => r.scriptSellerId)
      .filter((id): id is string => !!id);
    
    const sellerRolesMap = new Map<string, string[] | null>();
    const sellerImagesMap = new Map<string, string | null>();
    if (sellerIds.length > 0) {
      // Fetch all sellers in one query
      const uniqueSellerIds = [...new Set(sellerIds)];
      const sellers = await db
        .select({ id: users.id, roles: users.roles, profilePicture: users.profilePicture, image: users.image })
        .from(users)
        .where(inArray(users.id, uniqueSellerIds));
      
      sellers.forEach(seller => {
        sellerRolesMap.set(seller.id, seller.roles);
        sellerImagesMap.set(seller.id, getUserProfilePicture(seller));
      });
    }

    // Map results with seller info
    const mappedResults = results.map(result => ({
      ...result,
      scriptSellerImage: result.scriptSellerId ? sellerImagesMap.get(result.scriptSellerId) || null : null,
      scriptSellerRoles: result.scriptSellerId ? sellerRolesMap.get(result.scriptSellerId) || null : null,
    }));

    return mappedResults;
  } catch (error) {
    console.error('Error fetching featured scripts with details:', error);
    return [];
  }
}

// Get featured script by ID
export async function getFeaturedScriptById(id: number) {
  try {
    const result = await db.select().from(featuredScripts).where(eq(featuredScripts.id, id)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching featured script:', error);
    return null;
  }
}

// Get user's featured scripts
export async function getUserFeaturedScripts(userId: string, limit?: number) {
  try {
    const limitVal = limit || 100;
    
    const results = await db
      .select({
        // Featured script fields
        id: featuredScripts.id,
        scriptId: featuredScripts.scriptId,
        featuredSlotUniqueId: featuredScripts.featuredSlotUniqueId,
        featuredSlotStatus: featuredScripts.featuredSlotStatus,
        featuredStartDate: featuredScripts.featuredStartDate,
        featuredEndDate: featuredScripts.featuredEndDate,
        featuredCreatedBy: featuredScripts.featuredCreatedBy,
        featuredStatus: featuredScripts.featuredStatus,
        featuredClickCount: featuredScripts.featuredClickCount,
        featuredViewCount: featuredScripts.featuredViewCount,
        featuredCreatedAt: featuredScripts.featuredCreatedAt,
        featuredUpdatedAt: featuredScripts.featuredUpdatedAt,
        // Script fields
        scriptTitle: approvedScripts.title,
        scriptDescription: approvedScripts.description,
        scriptCoverImage: approvedScripts.coverImage,
      })
      .from(featuredScripts)
      .leftJoin(approvedScripts, eq(featuredScripts.scriptId, approvedScripts.id))
      .where(
        and(
          eq(featuredScripts.featuredCreatedBy, userId),
          eq(featuredScripts.featuredSlotStatus, 'active'),
          eq(featuredScripts.featuredStatus, 'active')
        )
      )
      .orderBy(desc(featuredScripts.featuredCreatedAt))
      .limit(limitVal);

    return results;
  } catch (error) {
    console.error('Error fetching user featured scripts:', error);
    return [];
  }
}

// Update featured script
export async function updateFeaturedScript(id: number, updateData: any) {
  try {
    // Get the featured script to retrieve scriptId before updating
    const featuredScript = await db.select()
      .from(featuredScripts)
      .where(eq(featuredScripts.id, id))
      .limit(1);
    
    if (featuredScript.length === 0) {
      return null;
    }
    
    // Map update data to new column names
    const mappedUpdate: any = { featuredUpdatedAt: new Date() };
    if (updateData.status !== undefined) mappedUpdate.featuredStatus = updateData.status;
    if (updateData.endDate !== undefined) mappedUpdate.featuredEndDate = updateData.endDate;
    
    const result = await db.update(featuredScripts)
      .set(mappedUpdate)
      .where(eq(featuredScripts.id, id))
      .returning();
    
    return result[0] || null;
  } catch (error) {
    console.error('Error updating featured script:', error);
    return null;
  }
}

// Delete featured script
export async function deleteFeaturedScript(id: number) {
  try {
    // Delete the featured script
    const result = await db.delete(featuredScripts).where(eq(featuredScripts.id, id)).returning();
    
    return result.length > 0;
  } catch (error) {
    console.error('Error deleting featured script:', error);
    return false;
  }
}

// Increment click count for featured script
export async function incrementFeaturedScriptClickCount(featuredScriptId: number): Promise<boolean> {
  try {
    const result = await db
      .update(featuredScripts)
      .set({ 
        featuredClickCount: sql`${featuredScripts.featuredClickCount} + 1`,
        featuredUpdatedAt: new Date() 
      })
      .where(eq(featuredScripts.id, featuredScriptId))
      .returning();
    
    if (result.length === 0) {
      console.error(`[incrementFeaturedScriptClickCount] No featured script found with id: ${featuredScriptId}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`[incrementFeaturedScriptClickCount] Error incrementing click count:`, error);
    return false;
  }
}

// Increment view count for featured script
export async function incrementFeaturedScriptViewCount(featuredScriptId: number): Promise<boolean> {
  try {
    const result = await db
      .update(featuredScripts)
      .set({ 
        featuredViewCount: sql`${featuredScripts.featuredViewCount} + 1`,
        featuredUpdatedAt: new Date() 
      })
      .where(eq(featuredScripts.id, featuredScriptId))
      .returning();
    
    if (result.length === 0) {
      console.error(`[incrementFeaturedScriptViewCount] No featured script found with id: ${featuredScriptId}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`[incrementFeaturedScriptViewCount] Error incrementing view count:`, error);
    return false;
  }
}

// ── Categories (dynamic browse taxonomy) ───────────────────────────────────

/** Active categories for the storefront, optionally scoped to home / a section. */
export async function getCategories(opts?: { home?: boolean; appliesTo?: 'scripts' | 'props' }) {
  const conds = [eq(categories.isActive, true)];
  if (opts?.home) conds.push(eq(categories.showOnHome, true));
  if (opts?.appliesTo) conds.push(inArray(categories.appliesTo, [opts.appliesTo, 'both']));
  return db
    .select()
    .from(categories)
    .where(and(...conds))
    .orderBy(opts?.home ? asc(categories.homeOrder) : asc(categories.sortOrder), asc(categories.name));
}

/** ALL categories incl. inactive — for the admin panel. */
export async function getAllCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function createCategory(data: Omit<NewCategory, 'id'> & { id?: number }) {
  const slug = String((data as any).slug || '').trim().toLowerCase();
  if (!slug || !data.name) throw new Error('name and slug are required');
  const [row] = await db
    .insert(categories)
    .values({ ...data, id: data.id ?? genId(), slug } as any)
    .returning();
  return row;
}

export async function updateCategory(id: number, data: Partial<NewCategory>) {
  const patch: any = { ...data, updatedAt: new Date() };
  if (patch.slug) patch.slug = String(patch.slug).trim().toLowerCase();
  delete patch.id;
  const [row] = await db.update(categories).set(patch).where(eq(categories.id, id)).returning();
  return row ?? null;
}

export async function deleteCategory(id: number) {
  const [row] = await db.delete(categories).where(eq(categories.id, id)).returning();
  return row ?? null;
}

/** Active frameworks for the storefront filter facets. */
export async function getFrameworks() {
  return db
    .select()
    .from(frameworks)
    .where(eq(frameworks.isActive, true))
    .orderBy(asc(frameworks.sortOrder), asc(frameworks.name));
}

/** ALL frameworks incl. inactive — for the admin panel. */
export async function getAllFrameworks() {
  return db.select().from(frameworks).orderBy(asc(frameworks.sortOrder), asc(frameworks.name));
}

export async function createFramework(data: Omit<NewFramework, 'id'> & { id?: number }) {
  const slug = String((data as any).slug || '').trim().toLowerCase();
  if (!slug || !data.name) throw new Error('name and slug are required');
  const [row] = await db
    .insert(frameworks)
    .values({ ...data, id: data.id ?? genId(), slug } as any)
    .returning();
  return row;
}

export async function updateFramework(id: number, data: Partial<NewFramework>) {
  const patch: any = { ...data, updatedAt: new Date() };
  if (patch.slug) patch.slug = String(patch.slug).trim().toLowerCase();
  delete patch.id;
  const [row] = await db.update(frameworks).set(patch).where(eq(frameworks.id, id)).returning();
  return row ?? null;
}

export async function deleteFramework(id: number) {
  const [row] = await db.delete(frameworks).where(eq(frameworks.id, id)).returning();
  return row ?? null;
}

// ── Side banner bookings (4 scarce positions: each rail split top + bottom) ──
// Unlike userAdSlots (unlimited), only ONE live booking may exist per position
// — enforced by the `side_banner_one_live_per_position` partial unique index.
// The index is on `position` (free text), so adding positions needs NO schema
// change: 'left-top' | 'left-bottom' | 'right-top' | 'right-bottom' just work.
export const SIDE_BANNER_POSITIONS = ['left-top', 'left-bottom', 'right-top', 'right-bottom'] as const;
export type SideBannerPosition = (typeof SIDE_BANNER_POSITIONS)[number];
export const SIDE_BANNER_DURATIONS = [1, 2, 3] as const; // weeks (match Tebex packages)
const SIDE_BANNER_HOLD_MINUTES = 15;

/**
 * Sweep stale rows to 'expired' so the partial unique index reflects only LIVE
 * holds/bookings: reserved holds past reservedUntil, and active bookings past
 * endDate. Idempotent; call before any availability check / reservation.
 */
export async function sweepExpiredSideBanners(): Promise<void> {
  const now = new Date();
  await db
    .update(sideBannerBookings)
    .set({ status: 'expired', updatedAt: now })
    .where(and(eq(sideBannerBookings.status, 'reserved'), lt(sideBannerBookings.reservedUntil, now)));
  await db
    .update(sideBannerBookings)
    .set({ status: 'expired', updatedAt: now })
    .where(and(eq(sideBannerBookings.status, 'active'), lt(sideBannerBookings.endDate, now)));
}

/** Active banners (status='active') keyed by position — for display. */
export async function getActiveSideBanners(): Promise<Record<string, typeof sideBannerBookings.$inferSelect>> {
  await sweepExpiredSideBanners();
  const rows = await db
    .select()
    .from(sideBannerBookings)
    .where(eq(sideBannerBookings.status, 'active'));
  const byPos: Record<string, any> = {};
  for (const r of rows) byPos[r.position] = r; // one per position (unique lock)
  return byPos;
}

/** Per-position availability for the advertise UI. */
export async function getSideBannerAvailability(): Promise<
  Record<string, { available: boolean; status?: string; until?: Date | null }>
> {
  await sweepExpiredSideBanners();
  const result: Record<string, { available: boolean; status?: string; until?: Date | null }> = {};
  for (const pos of SIDE_BANNER_POSITIONS) result[pos] = { available: true };
  const live = await db
    .select()
    .from(sideBannerBookings)
    .where(inArray(sideBannerBookings.status, ['reserved', 'active']));
  for (const r of live) {
    result[r.position] = {
      available: false,
      status: r.status,
      until: r.status === 'active' ? r.endDate : r.reservedUntil,
    };
  }
  return result;
}

/**
 * Reserve a position for checkout (15-min hold). The partial unique index makes
 * this the overselling lock: a racing second reserve for the same position hits
 * a unique violation and returns { ok:false, reason:'taken' }.
 */
export async function reserveSideBanner(input: {
  position: SideBannerPosition;
  userId: string;
  durationWeeks: number;
  title?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
}): Promise<{ ok: true; bookingId: number } | { ok: false; reason: string }> {
  if (!SIDE_BANNER_POSITIONS.includes(input.position)) return { ok: false, reason: 'bad_position' };
  if (!SIDE_BANNER_DURATIONS.includes(input.durationWeeks as any)) return { ok: false, reason: 'bad_duration' };
  await sweepExpiredSideBanners();
  const now = new Date();
  const reservedUntil = new Date(now.getTime() + SIDE_BANNER_HOLD_MINUTES * 60 * 1000);

  // If THIS user already holds a live reservation for this position (e.g. they
  // abandoned a checkout), reuse + refresh it instead of blocking them as "taken".
  const own = await db
    .select()
    .from(sideBannerBookings)
    .where(
      and(
        eq(sideBannerBookings.position, input.position),
        eq(sideBannerBookings.status, 'reserved'),
        eq(sideBannerBookings.createdBy, input.userId)
      )
    );
  if (own.length > 0) {
    await db
      .update(sideBannerBookings)
      .set({ durationWeeks: input.durationWeeks, reservedUntil, updatedAt: now })
      .where(eq(sideBannerBookings.id, own[0].id));
    return { ok: true, bookingId: own[0].id };
  }

  try {
    const [row] = await db
      .insert(sideBannerBookings)
      .values({
        id: genId(),
        position: input.position,
        status: 'reserved',
        title: input.title ?? null,
        imageUrl: input.imageUrl ?? null,
        linkUrl: input.linkUrl ?? null,
        createdBy: input.userId,
        durationWeeks: input.durationWeeks,
        reservedUntil,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: sideBannerBookings.id });
    return { ok: true, bookingId: row.id };
  } catch (e: any) {
    const msg = String(e?.cause?.message || e?.message || e);
    // Postgres unique_violation (23505) = the position is genuinely taken (the
    // overselling lock). Anything else (e.g. the buyer's user row is missing →
    // FK violation) is a real error — surface it instead of lying "taken".
    const isUnique = msg.includes('23505') || /unique/i.test(msg);
    if (!isUnique) console.error('reserveSideBanner insert failed (not the lock):', msg);
    return { ok: false, reason: isUnique ? 'taken' : 'error' };
  }
}

/**
 * FK-safety: make sure the buyer's user row exists before we insert a booking
 * that references it (created_by). Normally login upserts the user, but a stale
 * session (e.g. after a local DB reset) can leave a valid JWT with no row.
 */
export async function ensureUserExists(u: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string | null;
}): Promise<void> {
  if (!u?.id) return;
  await db
    .insert(users)
    .values({
      id: u.id,
      name: u.name ?? null,
      email: u.email ?? null,
      image: u.image ?? null,
      username: u.username ?? null,
    })
    .onConflictDoNothing();
}

/** Look up a booking by id. */
export async function getSideBannerBooking(bookingId: number) {
  const [row] = await db.select().from(sideBannerBookings).where(eq(sideBannerBookings.id, bookingId));
  return row ?? null;
}

/** Release a reservation (e.g. if basket creation fails) so the position frees up. */
export async function releaseSideBannerReservation(bookingId: number): Promise<void> {
  await db
    .update(sideBannerBookings)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(sideBannerBookings.id, bookingId), eq(sideBannerBookings.status, 'reserved')));
}

/** A user's own side-banner bookings (active + reserved), newest first — for the dashboard. */
export async function getUserSideBanners(userId: string) {
  await sweepExpiredSideBanners();
  return db
    .select()
    .from(sideBannerBookings)
    .where(and(eq(sideBannerBookings.createdBy, userId), inArray(sideBannerBookings.status, ['active', 'reserved'])))
    .orderBy(desc(sideBannerBookings.createdAt));
}

/**
 * Owner edits the banner creative (image / link / title) on their slot — like
 * managing an ad after buying its slot. Only the owner, only an ACTIVE booking.
 */
export async function updateSideBannerCreative(
  bookingId: number,
  userId: string,
  creative: { imageUrl?: string | null; linkUrl?: string | null; title?: string | null }
): Promise<{ ok: boolean; reason?: string }> {
  const booking = await getSideBannerBooking(bookingId);
  if (!booking) return { ok: false, reason: 'not_found' };
  if (booking.createdBy !== userId) return { ok: false, reason: 'forbidden' };
  if (booking.status !== 'active') return { ok: false, reason: 'not_active' };
  await db
    .update(sideBannerBookings)
    .set({
      imageUrl: creative.imageUrl ?? null,
      linkUrl: creative.linkUrl ?? null,
      title: creative.title ?? null,
      updatedAt: new Date(),
    })
    .where(eq(sideBannerBookings.id, bookingId));
  return { ok: true };
}

/**
 * Promote a reserved booking to active once Tebex payment is confirmed.
 * Idempotent. If the position was meanwhile taken (rare: hold expired + someone
 * else booked + late payment), the unique index blocks the update → we cancel
 * the booking and flag it for refund instead of crashing.
 */
export async function activateSideBanner(
  bookingId: number,
  orderReference: string
): Promise<{ activated: boolean; needsRefund?: boolean }> {
  const booking = await getSideBannerBooking(bookingId);
  if (!booking) return { activated: false };
  if (booking.status === 'active') return { activated: true }; // idempotent
  const weeks = booking.durationWeeks || 1;
  const now = new Date();
  const endDate = new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  try {
    await db
      .update(sideBannerBookings)
      .set({ status: 'active', startDate: now, endDate, orderReference, reservedUntil: null, updatedAt: now })
      .where(eq(sideBannerBookings.id, bookingId));
    return { activated: true };
  } catch (e) {
    // Position taken by another live booking → can't honor this purchase.
    await db
      .update(sideBannerBookings)
      .set({ status: 'cancelled', orderReference, updatedAt: now })
      .where(eq(sideBannerBookings.id, bookingId));
    console.error('activateSideBanner: position taken, flagging refund for booking', bookingId);
    return { activated: false, needsRefund: true };
  }
}

// ── Verified-creator verification requests ─────────────────────────────
/** A creator's latest verification request (to show their status). */
export async function getUserVerificationRequest(userId: string) {
  const [row] = await db
    .select()
    .from(verificationRequests)
    .where(eq(verificationRequests.userId, userId))
    .orderBy(desc(verificationRequests.createdAt))
    .limit(1);
  return row ?? null;
}

/** Submit a verification request. Blocks a second while one is already pending. */
export async function createVerificationRequest(input: {
  userId: string;
  reason?: string | null;
  links?: string | null;
  discord?: string | null;
}): Promise<{ ok: true; id: number } | { ok: false; reason: string }> {
  const user = await getUserById(input.userId);
  if (user && Array.isArray(user.roles) && user.roles.includes('verified_creator')) {
    return { ok: false, reason: 'already_verified' };
  }
  const existing = await getUserVerificationRequest(input.userId);
  if (existing && existing.status === 'pending') return { ok: false, reason: 'pending_exists' };
  const [row] = await db
    .insert(verificationRequests)
    .values({
      id: genId(),
      userId: input.userId,
      reason: input.reason ?? null,
      links: input.links ?? null,
      discord: input.discord ?? null,
      status: 'pending',
    })
    .returning({ id: verificationRequests.id });
  return { ok: true, id: row.id };
}

/** Pending requests for the admin queue, with the applicant's basic info. */
export async function getPendingVerificationRequests() {
  const rows = await db
    .select()
    .from(verificationRequests)
    .where(eq(verificationRequests.status, 'pending'))
    .orderBy(asc(verificationRequests.createdAt));
  const ids = Array.from(new Set(rows.map((r) => r.userId)));
  const usersRows = ids.length ? await db.select().from(users).where(inArray(users.id, ids)) : [];
  const byId = new Map(usersRows.map((u) => [u.id, u]));
  return rows.map((r) => {
    const u = byId.get(r.userId);
    return {
      ...r,
      userName: u?.name ?? null,
      userUsername: u?.username ?? null,
      userEmail: u?.email ?? null,
      userImage: u ? getUserProfilePicture(u) : null,
    };
  });
}

/** Approve (grant verified_creator role) or reject (with reason) a request. */
export async function reviewVerificationRequest(
  id: number,
  adminId: string,
  action: 'approve' | 'reject',
  adminReason?: string | null
): Promise<{ ok: boolean; reason?: string }> {
  const [reqRow] = await db.select().from(verificationRequests).where(eq(verificationRequests.id, id));
  if (!reqRow) return { ok: false, reason: 'not_found' };
  const now = new Date();

  if (action === 'approve') {
    const user = await getUserById(reqRow.userId);
    const current = Array.isArray(user?.roles) ? (user!.roles as string[]) : ['user'];
    if (!current.includes('verified_creator')) {
      await updateUserRole(reqRow.userId, [...current, 'verified_creator']);
    }
    await db
      .update(verificationRequests)
      .set({ status: 'approved', reviewedBy: adminId, reviewedAt: now, adminReason: adminReason ?? null, updatedAt: now })
      .where(eq(verificationRequests.id, id));
    return { ok: true };
  }

  await db
    .update(verificationRequests)
    .set({ status: 'rejected', reviewedBy: adminId, reviewedAt: now, adminReason: adminReason ?? null, updatedAt: now })
    .where(eq(verificationRequests.id, id));
  return { ok: true };
}

// ── Per-seller Tebex store (connect + import) ──────────────────────────
/** Save (or clear, with null) the seller's own Tebex webstore public token. */
export async function setUserTebexStoreToken(userId: string, token: string | null) {
  const [row] = await db
    .update(users)
    .set({ tebexStoreToken: token, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return row ?? null;
}

/**
 * The Tebex package ids this seller has ALREADY imported (across pending /
 * approved / rejected listings) — used to grey-out duplicates in the importer.
 */
export async function getUserImportedTebexPackageIds(userId: string): Promise<string[]> {
  const [p, a, r] = await Promise.all([
    db.select({ pkg: pendingScripts.tebexPackageId }).from(pendingScripts).where(eq(pendingScripts.sellerId, userId)),
    db.select({ pkg: approvedScripts.tebexPackageId }).from(approvedScripts).where(eq(approvedScripts.sellerId, userId)),
    db.select({ pkg: rejectedScripts.tebexPackageId }).from(rejectedScripts).where(eq(rejectedScripts.sellerId, userId)),
  ]);
  const set = new Set<string>();
  for (const x of [...p, ...a, ...r]) if (x.pkg) set.add(String(x.pkg));
  return Array.from(set);
}

// ── Giveaway prize-delivery tracker (#5, creator-side, anti-scam) ──────────
// Winners already exist in giveaway_prize_winners (created by
// trigger-winner-selection). `claimed` doubles as the "Delivered" flag; a
// creator marks who got what so nobody can double-claim.

export type CreatorGiveawayWinner = {
  id: number;
  prizeId: number;
  giveawayId: number;
  giveawayTitle: string;
  prizeName: string;
  prizePosition: number;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  delivered: boolean;
  deliveredAt: string | null;
  notes: string | null;
  createdAt: string | null;
};

/**
 * All winners across the creator's OWN giveaways, joined
 * winner → prize → giveaway (approved_giveaways.creator_id === userId).
 * Winners only exist on approved giveaways (created by trigger-winner-selection).
 */
export async function getCreatorGiveawayWinners(userId: string): Promise<CreatorGiveawayWinner[]> {
  const rows = await db
    .select({
      id: giveawayPrizeWinners.id,
      prizeId: giveawayPrizeWinners.prizeId,
      userId: giveawayPrizeWinners.userId,
      userName: giveawayPrizeWinners.userName,
      userEmail: giveawayPrizeWinners.userEmail,
      claimed: giveawayPrizeWinners.claimed,
      deliveredAt: giveawayPrizeWinners.deliveredAt,
      notes: giveawayPrizeWinners.notes,
      createdAt: giveawayPrizeWinners.createdAt,
      prizeName: giveawayPrizes.name,
      prizePosition: giveawayPrizes.position,
      giveawayId: approvedGiveaways.id,
      giveawayTitle: approvedGiveaways.title,
    })
    .from(giveawayPrizeWinners)
    .innerJoin(giveawayPrizes, eq(giveawayPrizeWinners.prizeId, giveawayPrizes.id))
    .innerJoin(approvedGiveaways, eq(giveawayPrizes.giveawayId, approvedGiveaways.id))
    .where(eq(approvedGiveaways.creatorId, userId))
    .orderBy(desc(approvedGiveaways.id), asc(giveawayPrizes.position));

  return rows.map((r) => ({
    id: r.id,
    prizeId: r.prizeId,
    giveawayId: r.giveawayId,
    giveawayTitle: r.giveawayTitle,
    prizeName: r.prizeName,
    prizePosition: r.prizePosition,
    userId: r.userId,
    userName: r.userName,
    userEmail: r.userEmail,
    delivered: !!r.claimed,
    deliveredAt: r.deliveredAt ? new Date(r.deliveredAt).toISOString() : null,
    notes: r.notes ?? null,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
  }));
}

/**
 * Mark a winner delivered (or not) + set notes. OWNERSHIP-CHECKED: the winner's
 * prize must belong to a giveaway created by `creatorId`. Rejects otherwise so a
 * creator can never touch another creator's winners.
 */
export async function setGiveawayWinnerDelivered(
  winnerId: number,
  creatorId: string,
  delivered: boolean,
  notes: string | null
): Promise<{ ok: boolean; reason?: 'not_found' | 'forbidden' }> {
  // Verify ownership: winner → prize → giveaway.creatorId === creatorId.
  const [owned] = await db
    .select({ winnerId: giveawayPrizeWinners.id, creatorId: approvedGiveaways.creatorId })
    .from(giveawayPrizeWinners)
    .innerJoin(giveawayPrizes, eq(giveawayPrizeWinners.prizeId, giveawayPrizes.id))
    .innerJoin(approvedGiveaways, eq(giveawayPrizes.giveawayId, approvedGiveaways.id))
    .where(eq(giveawayPrizeWinners.id, winnerId))
    .limit(1);

  if (!owned) return { ok: false, reason: 'not_found' };
  if (owned.creatorId !== creatorId) return { ok: false, reason: 'forbidden' };

  await db
    .update(giveawayPrizeWinners)
    .set({
      claimed: delivered,
      deliveredAt: delivered ? new Date() : null,
      notes: notes ?? null,
    })
    .where(eq(giveawayPrizeWinners.id, winnerId));

  return { ok: true };
}

// ── Recurring (Tebex subscription) slot lifecycle ──────────────────────
/**
 * A recurring payment started/renewed: keep every slot provisioned under this
 * Tebex order reference alive until `endDate` (Tebex's next_payment_at). Generic
 * across side banners / ad slots / featured slots — whichever match `orderRef`.
 */
export async function extendSlotsForRecurring(orderRef: string, endDate: Date) {
  const now = new Date();
  const sb = await db
    .update(sideBannerBookings)
    .set({ endDate, status: 'active', updatedAt: now })
    .where(and(
      eq(sideBannerBookings.orderReference, orderRef),
      inArray(sideBannerBookings.status, ['active', 'reserved', 'expired'])
    ))
    .returning({ id: sideBannerBookings.id });
  const ad = await db
    .update(userAdSlots)
    .set({ endDate, status: 'active' })
    .where(eq(userAdSlots.paypalOrderId, orderRef))
    .returning({ id: userAdSlots.id });
  const feat = await db
    .update(userFeaturedScriptSlots)
    .set({ featuredSlotEndDate: endDate, featuredSlotStatus: 'active' })
    .where(eq(userFeaturedScriptSlots.featuredPaypalOrderId, orderRef))
    .returning({ id: userFeaturedScriptSlots.id });
  return { sideBanners: sb.length, adSlots: ad.length, featuredSlots: feat.length };
}

/**
 * A subscription ended (Tebex `recurring-payment.ended`): stop the slot(s) under
 * this order reference. Unlike a refund it does NOT touch orders/coupons — the
 * customer just stopped renewing. Side-banner positions are freed ('expired')
 * so they can be re-sold.
 */
export async function endRecurringSlots(orderRef: string) {
  const now = new Date();
  const sb = await db
    .update(sideBannerBookings)
    .set({ status: 'expired', updatedAt: now })
    .where(and(
      eq(sideBannerBookings.orderReference, orderRef),
      inArray(sideBannerBookings.status, ['active', 'reserved'])
    ))
    .returning({ id: sideBannerBookings.id });
  await db.update(userAdSlots)
    .set({ status: 'inactive' })
    .where(eq(userAdSlots.paypalOrderId, orderRef));
  await db.update(userFeaturedScriptSlots)
    .set({ featuredSlotStatus: 'inactive' })
    .where(eq(userFeaturedScriptSlots.featuredPaypalOrderId, orderRef));
  return { sideBanners: sb.length };
}

// ── Listing view counters (creator analytics) ──────────────────────────
/** +1 on an approved script's detail-page view. Silent on error/missing. */
export async function incrementScriptViewCount(scriptId: number): Promise<void> {
  try {
    if (!Number.isFinite(scriptId)) return;
    await db.update(approvedScripts)
      .set({ viewCount: sql`${approvedScripts.viewCount} + 1` })
      .where(eq(approvedScripts.id, scriptId));
  } catch (e) {
    console.error('incrementScriptViewCount error:', e);
  }
}

/** +1 on an approved prop's detail-page view. Silent on error/missing. */
export async function incrementPropViewCount(propId: string): Promise<void> {
  try {
    if (!propId) return;
    await db.update(approvedProps)
      .set({ viewCount: sql`${approvedProps.viewCount} + 1` })
      .where(eq(approvedProps.id, propId));
  } catch (e) {
    console.error('incrementPropViewCount error:', e);
  }
}

// ── Creator analytics (only real, recorded data) ───────────────────────
/**
 * A creator's own analytics. Uses ONLY data FiveCrux actually records:
 *  - Sales/revenue + buyers: platform-cart prop sales (order_items → paid orders).
 *    (Scripts sell on the seller's OWN Tebex store, which FiveCrux can't see.)
 *  - Traffic: detail-page views on their scripts/props + ad & featured views/clicks.
 *  - Top performers: their listings by views + their props by sales.
 *  - Giveaways: entries · participants · winners · delivered.
 *  - Subscriptions: active side-banner / ad / featured slots + soonest renewal.
 *  - Listings: approved + pending counts.
 */
export async function getCreatorAnalytics(userId: string) {
  const num = (v: any) => Number(v ?? 0) || 0;

  // ── Listings (approved) ──
  const [myScripts, myProps] = await Promise.all([
    db.select({ id: approvedScripts.id, title: approvedScripts.title, views: approvedScripts.viewCount, price: approvedScripts.price })
      .from(approvedScripts).where(eq(approvedScripts.sellerId, userId)),
    db.select({ id: approvedProps.id, name: approvedProps.name, views: approvedProps.viewCount, price: approvedProps.price })
      .from(approvedProps).where(eq(approvedProps.createdBy, userId)),
  ]);
  const [pendScriptRows, pendPropRows] = await Promise.all([
    db.select({ id: pendingScripts.id }).from(pendingScripts).where(eq(pendingScripts.sellerId, userId)),
    db.select({ id: pendingProps.id }).from(pendingProps).where(eq(pendingProps.createdBy, userId)),
  ]);

  // ── Prop sales (platform cart, paid orders) ──
  const propIds = myProps.map((p) => p.id);
  const salesRows = propIds.length
    ? await db.select({ itemId: orderItems.itemId, title: orderItems.title, price: orderItems.price, qty: orderItems.quantity, buyer: orders.userId, at: orders.createdAt })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(inArray(orderItems.itemId, propIds), eq(orderItems.itemType, 'prop'), eq(orders.status, 'paid')))
    : [];
  let salesCount = 0, revenue = 0;
  const buyerSet = new Set<string>();
  const byItem = new Map<string, { title: string; count: number; revenue: number }>();
  for (const r of salesRows) {
    const q = num(r.qty), line = num(r.price) * q;
    salesCount += q; revenue += line;
    if (r.buyer) buyerSet.add(r.buyer);
    const e = byItem.get(r.itemId) ?? { title: r.title, count: 0, revenue: 0 };
    e.count += q; e.revenue += line; byItem.set(r.itemId, e);
  }

  // ── Traffic ──
  const scriptViews = myScripts.reduce((s, r) => s + num(r.views), 0);
  const propViews = myProps.reduce((s, r) => s + num(r.views), 0);
  const ads = await db.select({ v: approvedAds.viewCount, c: approvedAds.clickCount })
    .from(approvedAds).where(eq(approvedAds.createdBy, userId));
  const adViews = ads.reduce((s, a) => s + num(a.v), 0);
  const adClicks = ads.reduce((s, a) => s + num(a.c), 0);
  const feat = await db.select({ v: featuredScripts.featuredViewCount, c: featuredScripts.featuredClickCount })
    .from(featuredScripts)
    .innerJoin(approvedScripts, eq(featuredScripts.scriptId, approvedScripts.id))
    .where(eq(approvedScripts.sellerId, userId));
  const featuredViews = feat.reduce((s, f) => s + num(f.v), 0);
  const featuredClicks = feat.reduce((s, f) => s + num(f.c), 0);

  // ── Top performers ──
  const topByViews = [
    ...myScripts.map((s) => ({ type: 'script', id: String(s.id), name: s.title, views: num(s.views) })),
    ...myProps.map((p) => ({ type: 'prop', id: String(p.id), name: p.name, views: num(p.views) })),
  ].sort((a, b) => b.views - a.views).slice(0, 5);
  const topBySales = Array.from(byItem.entries())
    .map(([id, v]) => ({ id, name: v.title, count: v.count, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // ── Giveaways ──
  const myGiveaways = await db.select({ id: approvedGiveaways.id }).from(approvedGiveaways).where(eq(approvedGiveaways.creatorId, userId));
  const gIds = myGiveaways.map((g) => g.id);
  let totalEntries = 0; const participantSet = new Set<string>();
  let winners = 0, delivered = 0;
  if (gIds.length) {
    const entries = await db.select({ userId: giveawayEntries.userId }).from(giveawayEntries).where(inArray(giveawayEntries.giveawayId, gIds));
    totalEntries = entries.length;
    for (const e of entries) if (e.userId) participantSet.add(e.userId);
    const winRows = await db.select({ claimed: giveawayPrizeWinners.claimed })
      .from(giveawayPrizeWinners)
      .innerJoin(giveawayPrizes, eq(giveawayPrizeWinners.prizeId, giveawayPrizes.id))
      .where(inArray(giveawayPrizes.giveawayId, gIds));
    winners = winRows.length;
    delivered = winRows.filter((w) => w.claimed).length;
  }

  // ── Active subscriptions / slots + soonest renewal ──
  const [sbActive, adSlotsActive, featSlotsActive] = await Promise.all([
    db.select({ endDate: sideBannerBookings.endDate }).from(sideBannerBookings).where(and(eq(sideBannerBookings.createdBy, userId), eq(sideBannerBookings.status, 'active'))),
    db.select({ endDate: userAdSlots.endDate }).from(userAdSlots).where(and(eq(userAdSlots.userId, userId), eq(userAdSlots.status, 'active'))),
    db.select({ endDate: userFeaturedScriptSlots.featuredSlotEndDate }).from(userFeaturedScriptSlots).where(and(eq(userFeaturedScriptSlots.featuredUserId, userId), eq(userFeaturedScriptSlots.featuredSlotStatus, 'active'))),
  ]);
  const renewalDates = [...sbActive, ...adSlotsActive, ...featSlotsActive]
    .map((r) => r.endDate).filter(Boolean).map((d) => new Date(d as any).getTime()).filter((t) => !isNaN(t)).sort((a, b) => a - b);
  const nextRenewal = renewalDates.length ? new Date(renewalDates[0]).toISOString() : null;

  return {
    sales: { count: salesCount, revenue: Number(revenue.toFixed(2)), buyers: buyerSet.size, currency: 'EUR' },
    traffic: {
      total: scriptViews + propViews + adViews + featuredViews,
      scriptViews, propViews,
      ads: { views: adViews, clicks: adClicks },
      featured: { views: featuredViews, clicks: featuredClicks },
    },
    topByViews,
    topBySales,
    giveaways: { count: gIds.length, entries: totalEntries, participants: participantSet.size, winners, delivered },
    subscriptions: { sideBanners: sbActive.length, adSlots: adSlotsActive.length, featuredSlots: featSlotsActive.length, active: sbActive.length + adSlotsActive.length + featSlotsActive.length, nextRenewal },
    listings: { scripts: myScripts.length, props: myProps.length, pendingScripts: pendScriptRows.length, pendingProps: pendPropRows.length },
  };
}
