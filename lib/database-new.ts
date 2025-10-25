import { db } from './db/client';
import { eq, and, or, like, gte, lte, sql, desc, getTableColumns, ne } from 'drizzle-orm';
import { 
  users, pendingScripts, approvedScripts, rejectedScripts, 
  pendingGiveaways, approvedGiveaways, rejectedGiveaways, 
  giveawayEntries, 
  giveawayRequirements, giveawayPrizes, pendingAds, approvedAds, rejectedAds,
  type Script, type Giveaway 
} from './db/schema';
import type { 
  NewUser, NewScript, NewGiveaway, NewGiveawayEntry, 
  NewAd, 
  NewGiveawayRequirement, NewGiveawayPrize 
} from './db/schema';
import { validateFrameworks, isValidFramework } from './constants';

// Valid roles in the system
export const VALID_ROLES = ['founder', 'verified_creator', 'crew', 'admin', 'moderator', 'user'] as const;
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
  forceAdminIfUsername?: string | null;
}) {
  // Check if user already exists
  const existingUser = await getUserById(user.id);
  
  // Determine roles based on user status
  let userRoles: string[];
  
  if (existingUser) {
    // Existing user: Keep their current roles (don't overwrite)
    userRoles = validateRoles(existingUser.roles || ['user']);
  } else {
    // New user: Assign default roles
    if (user.forceAdminIfUsername && user.username === user.forceAdminIfUsername) {
      userRoles = ['founder']; // Give founder role to special user
    } else {
      userRoles = ['user']; // Default role for new users
    }
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
      // Don't overwrite roles for existing users
      roles: existingUser ? existingUser.roles : userRoles,
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

// Script functions
export async function createScript(scriptData: NewScript & { framework?: string | string[] }): Promise<number> {
  // Generate a smaller ID that fits PostgreSQL integer limits (max: 2,147,483,647)
  const timestamp = Math.floor(Date.now() / 10000); // Divide by 10000 to get smaller number
  const randomSuffix = Math.floor(Math.random() * 1000);
  const id = timestamp + randomSuffix;
  
  const frameworkArray = Array.isArray((scriptData as any).framework)
    ? ((scriptData as any).framework as string[])
    : (typeof (scriptData as any).framework === 'string' && (scriptData as any).framework
        ? [String((scriptData as any).framework)]
        : []);

  // Validate and filter frameworks
  const validatedFrameworks = validateFrameworks(frameworkArray);

  const scriptWithDefaults = {
    ...scriptData,
    id,
    seller_name: scriptData.seller_name || 'Unknown Seller',
    seller_email: scriptData.seller_email || 'unknown@example.com',
    featured: scriptData.featured ?? false,
    images: scriptData.images || [],
    videos: scriptData.videos || [],
    screenshots: scriptData.screenshots || [],
    // tags: scriptData.tags || [],
    features: scriptData.features || [],
    requirements: scriptData.requirements || [],
    link: scriptData.link || null,
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
    
    // Execute query with sorting and pagination
    const results = await query
      .orderBy(desc(approvedScripts.createdAt))
      .limit(limit)
      .offset(offset);
      
    // Map database fields to API-expected field names
    return results.map(script => ({
      ...script,
      cover_image: script.coverImage,
      original_price: script.originalPrice,
      seller_name: script.seller_name,
      seller_email: script.seller_email,
      created_at: script.createdAt,
      updated_at: script.updatedAt,
    }));
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
      
      // Fetch seller's Discord profile picture if sellerId exists
      let sellerImage = null;
      if (script.sellerId) {
        const sellerResult = await db.select().from(users).where(eq(users.id, script.sellerId));
        if (sellerResult.length > 0) {
          sellerImage = sellerResult[0].image;
        }
      }
      
      return { 
        ...script, 
        status: 'approved' as const,
        seller_image: sellerImage,
        cover_image: script.coverImage,
        original_price: script.originalPrice,
        seller_name: script.seller_name,
        seller_email: script.seller_email,
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
      
      // Fetch seller's Discord profile picture if sellerId exists
      let sellerImage = null;
      if (script.sellerId) {
        const sellerResult = await db.select().from(users).where(eq(users.id, script.sellerId));
        if (sellerResult.length > 0) {
          sellerImage = sellerResult[0].image;
        }
      }
      
      return { 
        ...script, 
        status: 'pending' as const,
        seller_image: sellerImage,
        cover_image: script.coverImage,
        original_price: script.originalPrice,
        seller_name: script.seller_name,
        seller_email: script.seller_email,
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
      
      // Fetch seller's Discord profile picture if sellerId exists
      let sellerImage = null;
      if (script.sellerId) {
        const sellerResult = await db.select().from(users).where(eq(users.id, script.sellerId));
        if (sellerResult.length > 0) {
          sellerImage = sellerResult[0].image;
        }
      }
      
      return { 
        ...script, 
        status: 'rejected' as const,
        seller_image: sellerImage,
        cover_image: script.coverImage,
        original_price: script.originalPrice,
        seller_name: script.seller_name,
        seller_email: script.seller_email,
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
    assignIfDefined('images', updateData.images);
    assignIfDefined('videos', updateData.videos);
    assignIfDefined('screenshots', updateData.screenshots);
    // Media with snake_case aliases
    if (updateData.coverImage !== undefined) assignIfDefined('coverImage', updateData.coverImage);
    if (updateData.cover_image !== undefined) assignIfDefined('coverImage', updateData.cover_image);
    assignIfDefined('version', updateData.version);
    if (updateData.featured !== undefined) assignIfDefined('featured', Boolean(updateData.featured));

    console.log('Mapped update object for re-approval:', mappedUpdate);

    // Start a transaction to move script from approved to pending
    const result = await db.transaction(async (tx) => {
      // 1. Delete from approved_scripts
      await tx.delete(approvedScripts).where(eq(approvedScripts.id, id));
      
      // 2. Insert into pending_scripts with updated data
      const newPendingScript = await tx.insert(pendingScripts)
        .values({
          ...currentScript[0],
          ...mappedUpdate,
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
    assignIfDefined('images', updateData.images);
    assignIfDefined('videos', updateData.videos);
    assignIfDefined('screenshots', updateData.screenshots);
    if (updateData.coverImage !== undefined) assignIfDefined('coverImage', updateData.coverImage);
    if (updateData.cover_image !== undefined) assignIfDefined('coverImage', updateData.cover_image);
    assignIfDefined('version', updateData.version);
    if (updateData.featured !== undefined) assignIfDefined('featured', Boolean(updateData.featured));

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
    assignIfDefined('images', updateData.images);
    assignIfDefined('videos', updateData.videos);
    assignIfDefined('screenshots', updateData.screenshots);
    if (updateData.coverImage !== undefined) assignIfDefined('coverImage', updateData.coverImage);
    if (updateData.cover_image !== undefined) assignIfDefined('coverImage', updateData.cover_image);
    assignIfDefined('version', updateData.version);
    if (updateData.featured !== undefined) assignIfDefined('featured', Boolean(updateData.featured));

    const result = await db.transaction(async (tx) => {
      await tx.delete(rejectedScripts).where(eq(rejectedScripts.id, id));
      const inserted = await tx.insert(pendingScripts)
        .values({
          ...currentScript[0],
          ...mappedUpdate,
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
    assignIfDefined('images', updateData.images);
    assignIfDefined('videos', updateData.videos);
    assignIfDefined('screenshots', updateData.screenshots);
    // Media with snake_case aliases
    if (updateData.coverImage !== undefined) assignIfDefined('coverImage', updateData.coverImage);
    if (updateData.cover_image !== undefined) assignIfDefined('coverImage', updateData.cover_image);
    assignIfDefined('version', updateData.version);
    if (updateData.featured !== undefined) assignIfDefined('featured', Boolean(updateData.featured));

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
  
  // Generate a unique ID that fits PostgreSQL integer limits (max: 2,147,483,647)
  const timestamp = Math.floor(Date.now() / 10000); // Divide by 10000 to get smaller number
  const randomSuffix = Math.floor(Math.random() * 1000);
  const id = timestamp + randomSuffix;
  
  // Provide default values for required fields
  const giveawayWithDefaults = {
    ...giveawayData,
    id: id,
    // Map snake_case input to camelCase schema fields
    totalValue: giveawayData.totalValue || (giveawayData as any).total_value || '0',
    endDate: giveawayData.endDate || (giveawayData as any).end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    creatorName: giveawayData.creatorName || (giveawayData as any).creator_name || 'Unknown Creator',
    creatorEmail: giveawayData.creatorEmail || (giveawayData as any).creator_email || 'unknown@example.com',
    creatorId: giveawayData.creatorId || (giveawayData as any).creator_id || 'unknown',
    status: giveawayData.status || 'active',
    featured: giveawayData.featured ?? false,
    autoAnnounce: giveawayData.autoAnnounce ?? (giveawayData as any).auto_announce ?? true, // ✅ ADD THIS LINE
    entriesCount: giveawayData.entriesCount || (giveawayData as any).entries_count || 0,
    maxEntries: giveawayData.maxEntries || (giveawayData as any).max_entries || null,
    // Map media fields
    images: giveawayData.images || (giveawayData as any).images || [],
    videos: giveawayData.videos || (giveawayData as any).videos || [],
    coverImage: giveawayData.coverImage || (giveawayData as any).cover_image || null,
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
  
  // Generate a unique ID that fits PostgreSQL integer limits (max: 2,147,483,647)
  const timestamp = Math.floor(Date.now() / 10000); // Divide by 10000 to get smaller number
  const randomSuffix = Math.floor(Math.random() * 1000);
  const id = timestamp + randomSuffix;
  
  // Map snake_case input to camelCase schema fields
  const mappedData = {
    ...requirementData,
    id: id,
    giveawayId: requirementData.giveawayId || (requirementData as any).giveaway_id
  };
  
  console.log('mappedData:', mappedData);
  
  const result = await db.insert(giveawayRequirements).values(mappedData).returning({ id: giveawayRequirements.id });
  return result[0]?.id;
}

export async function createGiveawayPrize(prizeData: NewGiveawayPrize) {
  console.log('createGiveawayPrize called with:', prizeData);
  
  // Generate a unique ID that fits PostgreSQL integer limits (max: 2,147,483,647)
  const timestamp = Math.floor(Date.now() / 10000); // Divide by 10000 to get smaller number
  const randomSuffix = Math.floor(Math.random() * 1000);
  const id = timestamp + randomSuffix;
  
  // Map snake_case input to camelCase schema fields
  const mappedData = {
    ...prizeData,
    id: id,
    giveawayId: prizeData.giveawayId || (prizeData as any).giveaway_id
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
  
  // Fetch creator images for each giveaway
  const giveawaysWithImages = await Promise.all(
    giveaways.map(async (giveaway: any) => {
      let creatorImage = null;
      if (giveaway.creatorId) {
        const creatorResult = await db.select().from(users).where(eq(users.id, giveaway.creatorId));
        if (creatorResult.length > 0) {
          creatorImage = creatorResult[0].image;
        }
      }
      return {
        ...giveaway,
        creatorImage,
      };
    })
  );
  
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
      
      // Fetch creator's Discord profile picture and roles if creatorId exists
      let creatorImage = null;
      let creatorRoles = null;
      if (giveaway.creatorId) {
        const creatorResult = await db.select().from(users).where(eq(users.id, giveaway.creatorId));
        if (creatorResult.length > 0) {
          creatorImage = creatorResult[0].image;
          creatorRoles = creatorResult[0].roles;
        }
      }
      
      return {
        ...giveaway,
        entriesCount: actualEntryCount, // Use actual count instead of stored count
        userEntry, // Include user's entry for points display
        requirements,
        prizes,
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
      
      // Count actual entries from giveaway_entries table
      const actualEntries = await db.select({ count: sql<number>`count(*)` })
        .from(giveawayEntries)
        .where(eq(giveawayEntries.giveawayId, id));
      const actualEntryCount = actualEntries[0]?.count || 0;
      
      // Fetch creator's Discord profile picture and roles if creatorId exists
      let creatorImage = null;
      let creatorRoles = null;
      if (giveaway.creatorId) {
        const creatorResult = await db.select().from(users).where(eq(users.id, giveaway.creatorId));
        if (creatorResult.length > 0) {
          creatorImage = creatorResult[0].image;
          creatorRoles = creatorResult[0].roles;
        }
      }
      
      return {
        ...giveaway,
        entriesCount: actualEntryCount, // Use actual count instead of stored count
        requirements,
        prizes,
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
      
      // Count actual entries from giveaway_entries table
      const actualEntries = await db.select({ count: sql<number>`count(*)` })
        .from(giveawayEntries)
        .where(eq(giveawayEntries.giveawayId, id));
      const actualEntryCount = actualEntries[0]?.count || 0;
      
      // Fetch creator's Discord profile picture and roles if creatorId exists
      let creatorImage = null;
      let creatorRoles = null;
      if (giveaway.creatorId) {
        const creatorResult = await db.select().from(users).where(eq(users.id, giveaway.creatorId));
        if (creatorResult.length > 0) {
          creatorImage = creatorResult[0].image;
          creatorRoles = creatorResult[0].roles;
        }
      }
      
      return {
        ...giveaway,
        entriesCount: actualEntryCount, // Use actual count instead of stored count
        requirements,
        prizes,
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
    assignIfDefined('difficulty', updateData.difficulty);
    assignIfDefined('creator_name', updateData.creator_name);
    assignIfDefined('creator_email', updateData.creator_email);
    assignIfDefined('creator_id', updateData.creator_id);
    assignIfDefined('images', updateData.images);
    assignIfDefined('videos', updateData.videos);
    if (updateData.cover_image !== undefined) assignIfDefined('coverImage', updateData.cover_image);
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

export async function updateGiveaway(id: number, updateData: Partial<NewGiveaway>) {
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
      maxEntries: giveaway.maxEntries,
      difficulty: giveaway.difficulty,
      creatorName: giveaway.creatorName,
      creatorEmail: giveaway.creatorEmail,
      creatorId: giveaway.creatorId,
      images: giveaway.images,
      videos: giveaway.videos,
      coverImage: giveaway.coverImage,
      tags: giveaway.tags,
      rules: giveaway.rules,
      featured: giveaway.featured,
      autoAnnounce: giveaway.autoAnnounce,
      createdAt: giveaway.createdAt,
      updatedAt: new Date(),
      submittedAt: new Date(),
      adminNotes: giveaway.adminNotes
    };
    
    const updateObject: any = { 
      ...updateData, 
      updatedAt: new Date(),
      submittedAt: new Date()
    };
    
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
    
    // Generate a unique ID for Xata Lite compatibility
    // Use a smaller number that fits PostgreSQL integer limits
    const timestamp = Math.floor(Date.now() / 1000); // Convert to seconds
    const randomSuffix = Math.floor(Math.random() * 10000);
    const id = timestamp + randomSuffix;
    
    // Map snake_case input to camelCase schema fields
    const mappedData = {
      ...entryData,
      id: id,
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
  const timestamp = Math.floor(Date.now() / 1000);
  const randomSuffix = Math.floor(Math.random() * 10000);
  const id = timestamp + randomSuffix;

  // Map snake_case input to camelCase schema fields and provide defaults
  const mapped = {
    id: id,
    title: (adData as any).title,
    description: (adData as any).description,
    imageUrl: (adData as any).imageUrl ?? (adData as any).image_url ?? null,
    linkUrl: (adData as any).linkUrl ?? (adData as any).link_url ?? null,
    category: (adData as any).category,
    startDate: (adData as any).startDate ?? (adData as any).start_date ?? new Date(),
    endDate: (adData as any).endDate ?? (adData as any).end_date ?? null,
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
  // Generate a unique ID that fits PostgreSQL integer limits (max: 2,147,483,647)
  const timestamp = Math.floor(Date.now() / 10000); // Divide by 10000 to get smaller number
  const randomSuffix = Math.floor(Math.random() * 1000);
  const id = timestamp + randomSuffix;

  // Map snake_case input to camelCase schema fields and provide defaults
  const mapped = {
    id: id,
    title: (adData as any).title,
    description: (adData as any).description,
    imageUrl: (adData as any).imageUrl ?? (adData as any).image_url ?? null,
    linkUrl: (adData as any).linkUrl ?? (adData as any).link_url ?? null,
    category: (adData as any).category,
    startDate: (adData as any).startDate ?? (adData as any).start_date ?? new Date(),
    endDate: (adData as any).endDate ?? (adData as any).end_date ?? null,
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
    
    const limitVal = filters?.limit || 50;
    
    const query = conditions.length
      ? db.select().from(approvedAds).where(and(...conditions))
      : db.select().from(approvedAds);
    
    return await query
      .orderBy(desc(approvedAds.createdAt))
      .limit(limitVal) as any;
      
  } catch (error: any) {
    console.error('Error fetching ads:', error);
    throw error;
  }
}

// Helper function to get ads for specific page types
export async function getAdsForPage(pageType: 'scripts' | 'giveaways', limit?: number) {
  try {
    const allAds = await getAds({ status: "active", limit: 100 });
    
    let filteredAds;
    if (pageType === 'scripts') {
      // Show ads with category "both", "general", or "scripts"
      filteredAds = allAds.filter((ad: any) => 
        ad.category?.toLowerCase() === "both" || 
        ad.category?.toLowerCase() === "general" ||
        ad.category?.toLowerCase() === "scripts"
      );
    } else if (pageType === 'giveaways') {
      // Show ads with category "both", "general", or "giveaways"
      filteredAds = allAds.filter((ad: any) => 
        ad.category?.toLowerCase() === "both" || 
        ad.category?.toLowerCase() === "general" ||
        ad.category?.toLowerCase() === "giveaways"
      );
    } else {
      filteredAds = [];
    }
    
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
      adminNotes: pendingAds.adminNotes,
      creator_name: users.name,
      creator_email: users.email,
      creator_id: users.id,
    })
    .from(pendingAds)
    .leftJoin(users, eq(pendingAds.createdBy, users.id))
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
      approvedAt: approvedAds.approvedAt,
      approvedBy: approvedAds.approvedBy,
      adminNotes: approvedAds.adminNotes,
      creator_name: users.name,
      creator_email: users.email,
      creator_id: users.id,
    })
    .from(approvedAds)
    .leftJoin(users, eq(approvedAds.createdBy, users.id))
    .orderBy(desc(approvedAds.approvedAt));
  return await (limit ? base.limit(limit) : base) as any[];
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