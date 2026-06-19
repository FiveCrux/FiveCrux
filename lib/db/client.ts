import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// ---------------------------------------------------------------------------
// TODO: remove before production — local in-process Postgres (PGlite) so the
// full app (cart / submit / admin-approve / Tebex) can be tested end-to-end
// WITHOUT a real Postgres server or Docker. Gated entirely behind USE_PGLITE.
// When USE_PGLITE !== 'true' this file behaves exactly as before (postgres-js).
// ---------------------------------------------------------------------------
const USE_PGLITE = process.env.USE_PGLITE === 'true';

type DB = ReturnType<typeof drizzle<typeof schema>>;

// Cache the connection on globalThis so Next.js dev HMR / multiple route
// bundles in the same process reuse ONE client (a second PGlite instance on the
// same data dir would fight over the files).
const g = globalThis as unknown as { __fivecruxDb?: DB };

function createDb(): DB {
  if (USE_PGLITE) {
    // Lazy require so the WASM Postgres is never bundled/loaded in production.
    const { PGlite } = require('@electric-sql/pglite');
    const { drizzle: drizzlePglite } = require('drizzle-orm/pglite');
    const dataDir = process.env.PGLITE_DIR || './.pglite';
    const client = new PGlite(dataDir);
    console.log(`[db] PGlite (local dev) initialized at ${dataDir}`);
    return drizzlePglite(client, { schema }) as unknown as DB;
  }

  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString, {
    max: 3, // Maximum number of connections
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout
    max_lifetime: 60 * 30, // Close connections after 30 minutes
  });
  console.log('Database connection initialized with connection pooling');
  return drizzle(client, { schema });
}

export const db: DB = g.__fivecruxDb ?? createDb();
if (USE_PGLITE) g.__fivecruxDb = db;

// Export schema for use in other files
export * from './schema';
