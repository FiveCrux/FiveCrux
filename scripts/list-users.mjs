// READ-ONLY inspection of the users table in the .env.local DATABASE_URL.
// No writes — a single SELECT. Helps debug auth (e.g. a malformed account row).
//   node scripts/list-users.mjs
import postgres from "postgres";
import { readFileSync } from "fs";

function getDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const txt = readFileSync(".env.local", "utf8");
  const m = txt.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
  if (!m) throw new Error("DATABASE_URL not found in .env.local");
  return m[1].trim().replace(/^['"]|['"]$/g, "");
}

const sql = postgres(getDbUrl(), { max: 1, idle_timeout: 5 });
try {
  const rows = await sql`
    SELECT id, username, name, email, roles, created_at
    FROM users
    ORDER BY created_at DESC NULLS LAST`;
  console.log(`\n${rows.length} user(s):\n`);
  for (const u of rows) {
    const email = u.email ? u.email.replace(/(.{2}).*(@.*)/, "$1***$2") : "(no email)";
    const roles = Array.isArray(u.roles) ? u.roles.join(",") : u.roles ?? "[]";
    console.log(`• id=${u.id}  @${u.username ?? "?"}  "${u.name ?? "?"}"  ${email}  roles=[${roles}]`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
