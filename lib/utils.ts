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
