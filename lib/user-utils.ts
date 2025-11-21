/**
 * Get user profile picture with priority:
 * 1. profile_picture (uploaded by user)
 * 2. image (Discord profile picture)
 * 3. null
 */
export function getUserProfilePicture(user: { 
  profilePicture?: string | null; 
  image?: string | null 
} | null | undefined): string | null {
  if (!user) return null;
  return user.profilePicture || user.image || null;
}

/**
 * Get user profile picture from session object
 */
export function getSessionUserProfilePicture(session: any): string | null {
  if (!session?.user) return null;
  const user = session.user as any;
  return user.profilePicture || user.image || null;
}

