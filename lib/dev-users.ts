// TODO: remove before production — the fixed set of local test identities.
// Split out from lib/dev-auth.ts so it has NO import of the live db client:
// scripts/setup-pglite.ts imports DEV_USERS to seed these users, and importing
// lib/dev-auth.ts directly would drag in lib/db/client.ts's module-level
// `createDb()` side effect — a second PGlite instance racing the seed script's
// own connection on the same on-disk directory, silently losing every write.
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
