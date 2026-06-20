// TODO: remove before production — server-side counterpart of the dev
// impersonation widget. Defines the fixed set of local test identities and
// upserts the chosen one into the DB so a REAL next-auth session (JWT cookie)
// can be issued for it. Only ever used when ALLOW_DEV_LOGIN=true.
//
// Keep the keys/ids/roles in sync with lib/dev-impersonation.ts (the client
// widget). The two halves form one harness: the widget calls signIn with a
// preset key, the Credentials provider (auth.ts) calls ensureDevUser(key),
// which guarantees the user row + roles exist before the session is built.
import { db } from "./db/client"
import { users } from "./db/schema"

export type DevUser = {
  id: string
  name: string
  email: string
  username: string
  roles: string[]
}

// Mirrors IMPERSONATION_PRESETS (minus "guest", which is a signOut).
export const DEV_USERS: Record<string, DevUser> = {
  admin: { id: "dev-admin", name: "Admin Dev", email: "admin@fivecrux.local", username: "admindev", roles: ["admin", "founder", "moderator", "prop_lister"] },
  founder: { id: "dev-founder", name: "Founder Dev", email: "founder@fivecrux.local", username: "founderdev", roles: ["founder"] },
  moderator: { id: "dev-mod", name: "Mod Dev", email: "mod@fivecrux.local", username: "moddev", roles: ["moderator"] },
  creator: { id: "dev-creator", name: "CruxDev", email: "creator@fivecrux.local", username: "cruxdev", roles: ["prop_lister"] },
  buyer: { id: "dev-buyer", name: "Buyer Dev", email: "buyer@fivecrux.local", username: "buyerdev", roles: ["user"] },
  // Audit-only presets so the two rarely-used roles can be live-tested.
  verified_creator: { id: "dev-vcreator", name: "VCreator Dev", email: "vcreator@fivecrux.local", username: "vcreatordev", roles: ["verified_creator"] },
  crew: { id: "dev-crew", name: "Crew Dev", email: "crew@fivecrux.local", username: "crewdev", roles: ["crew"] },
}

// Insert (or refresh the roles of) a dev user so the session callback — which
// reads roles from the DB — sees the right access level.
export async function ensureDevUser(key: string): Promise<DevUser | null> {
  const u = DEV_USERS[key]
  if (!u) return null
  await db
    .insert(users)
    .values({ id: u.id, name: u.name, email: u.email, username: u.username, roles: u.roles })
    .onConflictDoUpdate({
      target: users.id,
      set: { name: u.name, email: u.email, username: u.username, roles: u.roles, updatedAt: new Date() },
    })
  return u
}
