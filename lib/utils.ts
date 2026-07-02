import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if a user has the verified_creator role
 * @param roles - Array of user roles or null/undefined
 * @returns true if the user has the verified_creator role
 */
export function isVerifiedCreator(roles: string[] | null | undefined): boolean {
  return Array.isArray(roles) && roles.includes('verified_creator');
}

/**
 * Clean up a display name that comes from Discord (usernames are often all
 * lowercase, e.g. "sidakftw"). Capitalizes the first letter of each word so it
 * reads cleaner ("sidakftw" → "Sidakftw", "john doe" → "John Doe") without
 * mangling names that are already cased. Whitespace-trimmed; null-safe.
 */
export function formatDisplayName(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.replace(/(^|\s)([a-z])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}
