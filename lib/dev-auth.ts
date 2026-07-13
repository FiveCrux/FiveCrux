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
import { DEV_USERS, type DevUser } from "./dev-users"

export type { DevUser }
export { DEV_USERS }

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
