// TODO: remove before production — dev-only impersonation so we can test the app
// as different roles/users (admin, founder, moderator, creator, buyer, guest)
// WITHOUT real Discord auth. Only active when NEXT_PUBLIC_MOCK_AUTH=true.
//
// This is the FiveCrux (next-auth) equivalent of an Azure "impersonation proxy":
// instead of injecting X-MS-* headers, we swap the client-side mock Session that
// SessionProvider hands to next-auth. The chosen identity is stored in localStorage
// so it survives reloads.
import type { Session } from "next-auth"

export type ImpersonationPreset = {
  key: string
  label: string
  description: string
  session: Session | null // null = logged out (guest)
}

function makeSession(u: {
  id: string
  name: string
  email: string
  username: string
  roles: string[]
}): Session {
  return {
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      image: null,
      username: u.username,
      roles: u.roles,
      profilePicture: null,
      Profile_picture: null,
    },
    expires: "2999-01-01T00:00:00.000Z",
  } as unknown as Session
}

export const IMPERSONATION_PRESETS: ImpersonationPreset[] = [
  {
    key: "admin",
    label: "Admin",
    description: "Full access — admin + founder + mod",
    session: makeSession({ id: "dev-admin", name: "Admin Dev", email: "admin@fivecrux.local", username: "admindev", roles: ["admin", "founder", "moderator", "prop_lister"] }),
  },
  {
    key: "founder",
    label: "Founder",
    description: "Founder role only",
    session: makeSession({ id: "dev-founder", name: "Founder Dev", email: "founder@fivecrux.local", username: "founderdev", roles: ["founder"] }),
  },
  {
    key: "moderator",
    label: "Moderator",
    description: "Moderator (review/approve)",
    session: makeSession({ id: "dev-mod", name: "Mod Dev", email: "mod@fivecrux.local", username: "moddev", roles: ["moderator"] }),
  },
  {
    key: "creator",
    label: "Creator / Seller",
    description: "Verified creator (prop_lister)",
    session: makeSession({ id: "dev-creator", name: "CruxDev", email: "creator@fivecrux.local", username: "cruxdev", roles: ["prop_lister"] }),
  },
  {
    key: "buyer",
    label: "Buyer",
    description: "Regular logged-in user",
    session: makeSession({ id: "dev-buyer", name: "Buyer Dev", email: "buyer@fivecrux.local", username: "buyerdev", roles: [] }),
  },
  {
    key: "guest",
    label: "Guest (logged out)",
    description: "No session — test logged-out state",
    session: null,
  },
]

const STORAGE_KEY = "fc_impersonate"
const DEFAULT_KEY = "admin"

export function getActiveImpersonationKey(): string {
  if (typeof window === "undefined") return DEFAULT_KEY
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_KEY
  } catch {
    return DEFAULT_KEY
  }
}

export function setActiveImpersonationKey(key: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, key)
  } catch {
    /* ignore */
  }
}

export function getActiveImpersonationPreset(): ImpersonationPreset {
  const key = getActiveImpersonationKey()
  return IMPERSONATION_PRESETS.find((p) => p.key === key) ?? IMPERSONATION_PRESETS[0]
}
