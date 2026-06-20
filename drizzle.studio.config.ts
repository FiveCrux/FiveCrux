// TODO: remove before production — Drizzle Studio config for the LOCAL PGlite
// test DB. Studio opens a snapshot copy (./.pglite-studio) so the dev server can
// keep running on ./.pglite at the same time (PGlite allows only one process per
// data dir). Refresh the snapshot with: npm run db:view  (re-copies + launches).
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  driver: 'pglite',
  dbCredentials: {
    url: process.env.STUDIO_PGLITE_DIR || './.pglite-studio',
  },
});
